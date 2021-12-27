import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { Clearcoat } from './clearcoat';
/**
 * # MaterialsClearcoat
 *
 * [KHR_materials_clearcoat](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_materials_clearcoat/)
 * defines a clear coating on a glTF PBR material.
 *
 * ![Illustration](/media/extensions/khr-materials-clearcoat.png)
 *
 * > _**Figure:** Comparison of a carbon-fiber material without clearcoat (left) and with clearcoat
 * > (right). Source: [Filament](https://google.github.io/filament/Materials.html)._
 *
 * A clear coat is a common technique used in Physically-Based
 * Rendering for a protective layer applied to a base material.
 * Commonly used to represent car paint, carbon fiber, or thin lacquers.
 *
 * Properties:
 * - {@link Clearcoat}
 *
 * ### Example
 *
 * ```typescript
 * import { MaterialsClearcoat, Clearcoat } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const clearcoatExtension = document.createExtension(MaterialsClearcoat);
 *
 * // Create Clearcoat property.
 * const clearcoat = clearcoatExtension.createClearcoat()
 *	.setClearcoatFactor(1.0);
 *
 * // Assign to a Material.
 * material.setExtension('KHR_materials_clearcoat', clearcoat);
 * ```
 */
export declare class MaterialsClearcoat extends Extension {
    readonly extensionName = "KHR_materials_clearcoat";
    static readonly EXTENSION_NAME = "KHR_materials_clearcoat";
    /** Creates a new Clearcoat property for use on a {@link Material}. */
    createClearcoat(): Clearcoat;
    /** @hidden */
    read(context: ReaderContext): this;
    /** @hidden */
    write(context: WriterContext): this;
}
