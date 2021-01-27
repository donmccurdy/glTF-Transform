import { Extension, PropertyType, ReaderContext, WriterContext } from '@gltf-transform/core';
import { EXT_MESH_GPU_INSTANCING } from '../constants';
import { InstancedMesh } from './instanced-mesh';

const NAME = EXT_MESH_GPU_INSTANCING;

// See BufferViewUsage in `writer.ts`.
const INSTANCE_ATTRIBUTE = 'INSTANCE_ATTRIBUTE';

interface InstancedMeshDef {
	attributes: {
		[name: string]: number;
	};
}

/** Documentation in {@link EXTENSIONS.md}. */
export class MeshGPUInstancing extends Extension {
	public readonly extensionName = NAME;
	public readonly provideTypes = [PropertyType.NODE];
	public readonly prewriteTypes = [PropertyType.ACCESSOR];
	public static readonly EXTENSION_NAME = NAME;

	public createInstancedMesh(): InstancedMesh {
		return new InstancedMesh(this.doc.getGraph(), this);
	}

	public read(context: ReaderContext): this {
		const jsonDoc = context.jsonDoc;

		const nodeDefs = jsonDoc.json.nodes || [];
		nodeDefs.forEach((nodeDef, nodeIndex) => {
			if (!nodeDef.extensions || !nodeDef.extensions[NAME]) return;

			const instancedMeshDef = nodeDef.extensions[NAME] as InstancedMeshDef;
			const instancedMesh = this.createInstancedMesh();

			for (const semantic in instancedMeshDef.attributes) {
				instancedMesh.setAttribute(
					semantic,
					context.accessors[instancedMeshDef.attributes[semantic]]
				);
			}

			context.nodes[nodeIndex].setExtension(NAME, instancedMesh);
		});

		return this;
	}

	public prewrite(context: WriterContext): this {
		// Set usage for instance attribute accessors, so they are stored in separate buffer
		// views grouped by parent reference.
		context.accessorUsageGroupedByParent.add(INSTANCE_ATTRIBUTE);
		for (const prop of this.properties) {
			for (const attribute of (prop as InstancedMesh).listAttributes()) {
				context.setAccessorUsage(attribute, INSTANCE_ATTRIBUTE);
			}
		}
		return this;
	}

	public write(context: WriterContext): this {
		const jsonDoc = context.jsonDoc;

		this.doc.getRoot()
			.listNodes()
			.forEach((node) => {
				const instancedMesh = node.getExtension<InstancedMesh>(NAME);
				if (instancedMesh) {
					const nodeIndex = context.nodeIndexMap.get(node)!;
					const nodeDef = jsonDoc.json.nodes![nodeIndex];

					const instancedMeshDef = {attributes: {}} as InstancedMeshDef;

					instancedMesh.listSemantics()
						.forEach((semantic) => {
							const attribute = instancedMesh.getAttribute(semantic)!;
							instancedMeshDef.attributes[semantic] =
								context.accessorIndexMap.get(attribute)!;
						});

					nodeDef.extensions = nodeDef.extensions || {};
					nodeDef.extensions[NAME] = instancedMeshDef;
				}
			});

		return this;
	}
}
