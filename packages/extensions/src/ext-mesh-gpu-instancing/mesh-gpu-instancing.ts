import { Extension, PropertyType, ReaderContext, WriterContext } from '@gltf-transform/core';
import { EXT_MESH_GPU_INSTANCING } from '../constants';
import { InstancedMesh } from './instanced-mesh';

const NAME = EXT_MESH_GPU_INSTANCING;

interface InstancedMeshDef {
	attributes: {
		[name: string]: number;
	};
}

/** Documentation in {@link EXTENSIONS.md}. */
export class MeshGPUInstancing extends Extension {
	public readonly extensionName = NAME;
	public readonly provideTypes = [PropertyType.NODE];
	public static readonly EXTENSION_NAME = NAME;

	public createInstancedMesh(): InstancedMesh {
		return new InstancedMesh(this.doc.getGraph(), this);
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public read(context: ReaderContext): this {
		const jsonDoc = context.jsonDoc;

		jsonDoc.json.nodes.forEach((nodeDef, nodeIndex) => {
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

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public write(context: WriterContext): this {
		const jsonDoc = context.jsonDoc;

		this.doc.getRoot()
			.listNodes()
			.forEach((node) => {
				const instancedMesh = node.getExtension<InstancedMesh>(NAME);
				if (instancedMesh) {
					const nodeIndex = context.nodeIndexMap.get(node);
					const nodeDef = jsonDoc.json.nodes[nodeIndex];

					const instancedMeshDef = {attributes: {}} as InstancedMeshDef;

					instancedMesh.listSemantics()
						.forEach((semantic) => {
							const attribute = instancedMesh.getAttribute(semantic);
							instancedMeshDef.attributes[semantic] =
								context.accessorIndexMap.get(attribute);
						});

					nodeDef.extensions = nodeDef.extensions || {};
					nodeDef.extensions[NAME] = instancedMeshDef;
				}
			});

		return this;
	}
}
