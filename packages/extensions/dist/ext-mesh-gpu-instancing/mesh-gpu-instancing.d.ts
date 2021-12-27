import { Extension, PropertyType, ReaderContext, WriterContext } from '@gltf-transform/core';
import { InstancedMesh } from './instanced-mesh';
/**
 * # MeshGPUInstancing
 *
 * [`EXT_mesh_gpu_instancing`](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_mesh_gpu_instancing/)
 * prepares mesh data for efficient GPU instancing.
 *
 * [[include:VENDOR_EXTENSIONS_NOTE.md]]
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
 * The `MeshGPUInstancing` class provides a single {@link ExtensionProperty} type, `InstancedMesh`,
 * which may be attached to any {@link Node} instance. For example:
 *
 * ```typescript
 * import { MeshGPUInstancing } from '@gltf-transform/extensions';
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
 * const batchExtension = document.createExtension(MeshGPUInstancing)
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
export declare class MeshGPUInstancing extends Extension {
    readonly extensionName = "EXT_mesh_gpu_instancing";
    /** @hidden */
    readonly provideTypes: PropertyType[];
    /** @hidden */
    readonly prewriteTypes: PropertyType[];
    static readonly EXTENSION_NAME = "EXT_mesh_gpu_instancing";
    /** Creates a new InstancedMesh property for use on a {@link Node}. */
    createInstancedMesh(): InstancedMesh;
    /** @hidden */
    read(context: ReaderContext): this;
    /** @hidden */
    prewrite(context: WriterContext): this;
    /** @hidden */
    write(context: WriterContext): this;
}
