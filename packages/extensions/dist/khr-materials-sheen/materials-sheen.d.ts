import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { Sheen } from './sheen';
/**
 * # MaterialsSheen
 *
 * [`KHR_materials_sheen`](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_sheen/)
 * defines a velvet-like sheen layered on a glTF PBR material.
 *
 * ![Illustration](/media/extensions/khr-materials-sheen.png)
 *
 * > _**Figure:** A cushion, showing high material roughness and low sheen roughness. Soft
 * > highlights at edges of the material show backscattering from microfibers. Source: Khronos
 * > Group._
 *
 * A sheen layer is a common technique used in Physically-Based Rendering to represent
 * cloth and fabric materials.
 *
 * Properties:
 * - {@link Sheen}
 *
 * ### Example
 *
 * The `MaterialsSheen` class provides a single {@link ExtensionProperty} type, `Sheen`,
 * which may be attached to any {@link Material} instance. For example:
 *
 * ```typescript
 * import { MaterialsSheen, Sheen } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const sheenExtension = document.createExtension(MaterialsSheen);
 *
 * // Create a Sheen property.
 * const sheen = sheenExtension.createSheen()
 * 	.setSheenColorFactor([1.0, 1.0, 1.0]);
 *
 * // Attach the property to a Material.
 * material.setExtension('KHR_materials_sheen', sheen);
 * ```
 */
export declare class MaterialsSheen extends Extension {
    readonly extensionName = "KHR_materials_sheen";
    static readonly EXTENSION_NAME = "KHR_materials_sheen";
    /** Creates a new Sheen property for use on a {@link Material}. */
    createSheen(): Sheen;
    /** @hidden */
    read(context: ReaderContext): this;
    /** @hidden */
    write(context: WriterContext): this;
}
