import { Extension, PropertyType, ReaderContext, WriterContext } from '@gltf-transform/core';
import { EXT_MESH_GPU_INSTANCING } from '../constants.js';
import { InstancedMesh, INSTANCE_ATTRIBUTE } from './instanced-mesh.js';

const NAME = EXT_MESH_GPU_INSTANCING;

interface InstancedMeshDef {
	attributes: {
		[name: string]: number;
	};
}

/**
 * [`EXT_mesh_gpu_instancing`](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_mesh_gpu_instancing/)
 * prepares mesh data for efficient GPU instancing.
 *
 * GPU instancing allows engines to render many copies of a single mesh at once using a small number
 * of draw calls. Instancing is particularly useful for things like trees, grass, road signs, etc.
 * Keep in mind that predefined batches, as used in this extension, may prevent frustum culling
 * within a batch. Dividing batches into collocated cells may be preferable to using a single large
 * batch.
 *
 * > _**NOTICE:** While this extension stores mesh data optimized for GPU instancing, it
 * > is important to note that (1) GPU instancing and other optimizations are possible — and
 * > encouraged — even without this extension, and (2) other common meanings of the term
 * > "instancing" exist, distinct from this extension. See
 * > [Appendix: Motivation and Purpose](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_mesh_gpu_instancing#appendix-motivation-and-purpose)
 * > of the `EXT_mesh_gpu_instancing` specification._
 *
 * Properties:
 * - {@link InstancedMesh}
 *
 * ### Example
 *
 * The `EXTMeshGPUInstancing` class provides a single {@link ExtensionProperty} type, `InstancedMesh`,
 * which may be attached to any {@link Node} instance. For example:
 *
 * ```typescript
 * import { EXTMeshGPUInstancing } from '@gltf-transform/extensions';
 *
 * // Create standard mesh, node, and scene hierarchy.
 * // ...
 *
 * // Assign positions for each instance.
 * const batchPositions = doc.createAccessor('instance_positions')
 * 	.setArray(new Float32Array([
 * 		0, 0, 0,
 * 		1, 0, 0,
 * 		2, 0, 0,
 * 	]))
 * 	.setType(Accessor.Type.VEC3)
 * 	.setBuffer(buffer);
 *
 * // Assign IDs for each instance.
 * const batchIDs = doc.createAccessor('instance_ids')
 * 	.setArray(new Uint8Array([0, 1, 2]))
 * 	.setType(Accessor.Type.SCALAR)
 * 	.setBuffer(buffer);
 *
 * // Create an Extension attached to the Document.
 * const batchExtension = document.createExtension(EXTMeshGPUInstancing)
 * 	.setRequired(true);
 * const batch = batchExtension.createInstancedMesh()
 * 	.setAttribute('TRANSLATION', batchPositions)
 * 	.setAttribute('_ID', batchIDs);
 *
 * node
 * 	.setMesh(mesh)
 * 	.setExtension('EXT_mesh_gpu_instancing', batch);
 * ```
 *
 * Standard instance attributes are `TRANSLATION`, `ROTATION`, and `SCALE`, and support the accessor
 * types allowed by the extension specification. Custom instance attributes are allowed, and should
 * be prefixed with an underscore (`_*`).
 */
export class EXTMeshGPUInstancing extends Extension {
	public readonly extensionName = NAME;
	/** @hidden */
	public readonly provideTypes = [PropertyType.NODE];
	/** @hidden */
	public readonly prewriteTypes = [PropertyType.ACCESSOR];
	public static readonly EXTENSION_NAME = NAME;

	/** Creates a new InstancedMesh property for use on a {@link Node}. */
	public createInstancedMesh(): InstancedMesh {
		return new InstancedMesh(this.document.getGraph());
	}

	/** @hidden */
	public read(context: ReaderContext): this {
		const jsonDoc = context.jsonDoc;

		const nodeDefs = jsonDoc.json.nodes || [];
		nodeDefs.forEach((nodeDef, nodeIndex) => {
			if (!nodeDef.extensions || !nodeDef.extensions[NAME]) return;

			const instancedMeshDef = nodeDef.extensions[NAME] as InstancedMeshDef;
			const instancedMesh = this.createInstancedMesh();

			for (const semantic in instancedMeshDef.attributes) {
				instancedMesh.setAttribute(semantic, context.accessors[instancedMeshDef.attributes[semantic]]);
			}

			context.nodes[nodeIndex].setExtension(NAME, instancedMesh);
		});

		return this;
	}

	/** @hidden */
	public prewrite(context: WriterContext): this {
		// Set usage for instance attribute accessors, so they are stored in separate buffer
		// views grouped by parent reference.
		context.accessorUsageGroupedByParent.add(INSTANCE_ATTRIBUTE);
		for (const prop of this.properties) {
			for (const attribute of (prop as InstancedMesh).listAttributes()) {
				context.addAccessorToUsageGroup(attribute, INSTANCE_ATTRIBUTE);
			}
		}
		return this;
	}

	/** @hidden */
	public write(context: WriterContext): this {
		const jsonDoc = context.jsonDoc;

		this.document
			.getRoot()
			.listNodes()
			.forEach((node) => {
				const instancedMesh = node.getExtension<InstancedMesh>(NAME);
				if (instancedMesh) {
					const nodeIndex = context.nodeIndexMap.get(node)!;
					const nodeDef = jsonDoc.json.nodes![nodeIndex];

					const instancedMeshDef = { attributes: {} } as InstancedMeshDef;

					instancedMesh.listSemantics().forEach((semantic) => {
						const attribute = instancedMesh.getAttribute(semantic)!;
						instancedMeshDef.attributes[semantic] = context.accessorIndexMap.get(attribute)!;
					});

					nodeDef.extensions = nodeDef.extensions || {};
					nodeDef.extensions[NAME] = instancedMeshDef;
				}
			});

		return this;
	}
}
