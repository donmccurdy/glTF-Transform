import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { IOR } from './ior';
/**
 * # MaterialsIOR
 *
 * [KHR_materials_ior](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_materials_ior/)
 * defines index of refraction on a glTF PBR material.
 *
 * The dielectric BRDF of the metallic-roughness material in glTF uses a fixed value of 1.5 for the
 * index of refraction. This is a good fit for many plastics and glass, but not for other materials
 * like water or asphalt, sapphire or diamond. `KHR_materials_ior` allows users to set the index of
 * refraction to a certain value.
 *
 * Properties:
 * - {@link IOR}
 *
 * ### Example
 *
 * ```typescript
 * import { MaterialsIOR, IOR } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const iorExtension = document.createExtension(MaterialsIOR);
 *
 * // Create IOR property.
 * const ior = iorExtension.createIOR().setIOR(1.0);
 *
 * // Assign to a Material.
 * material.setExtension('KHR_materials_ior', ior);
 * ```
 */
export declare class MaterialsIOR extends Extension {
    readonly extensionName = "KHR_materials_ior";
    static readonly EXTENSION_NAME = "KHR_materials_ior";
    /** Creates a new IOR property for use on a {@link Material}. */
    createIOR(): IOR;
    /** @hidden */
    read(context: ReaderContext): this;
    /** @hidden */
    write(context: WriterContext): this;
}
