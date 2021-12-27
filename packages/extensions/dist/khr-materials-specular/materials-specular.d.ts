import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { Specular } from './specular';
/**
 * # MaterialsSpecular
 *
 * [`KHR_materials_specular`](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_materials_specular/)
 * adjusts the strength of the specular reflection in the dielectric BRDF.
 *
 * MaterialsSpecular is a better alternative to the older
 * {@link MaterialsPBRSpecularGlossiness KHR_materials_pbrSpecularGlossiness} extension, and
 * provides specular information while remaining within a metal/rough PBR workflow. A
 * value of zero disables the specular reflection, resulting in a pure diffuse material.
 *
 * Properties:
 * - {@link Specular}
 *
 * ### Example
 *
 * The `MaterialsSpecular` class provides a single {@link ExtensionProperty} type, `Specular`,
 * which may be attached to any {@link Material} instance. For example:
 *
 * ```typescript
 * import { MaterialsSpecular, Specular } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const specularExtension = document.createExtension(MaterialsSpecular);
 *
 * // Create a Specular property.
 * const specular = specularExtension.createSpecular()
 * 	.setSpecularFactor(1.0);
 *
 * // Attach the property to a Material.
 * material.setExtension('KHR_materials_specular', specular);
 * ```
 */
export declare class MaterialsSpecular extends Extension {
    readonly extensionName = "KHR_materials_specular";
    static readonly EXTENSION_NAME = "KHR_materials_specular";
    /** Creates a new Specular property for use on a {@link Material}. */
    createSpecular(): Specular;
    /** @hidden */
    read(context: ReaderContext): this;
    /** @hidden */
    write(context: WriterContext): this;
}
