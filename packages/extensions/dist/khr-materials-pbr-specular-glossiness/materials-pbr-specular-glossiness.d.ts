import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { PBRSpecularGlossiness } from './pbr-specular-glossiness';
/**
 * # MaterialsPBRSpecularGlossiness
 *
 * [`KHR_materials_pbrSpecularGlossiness`](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_materials_pbrSpecularGlossiness/)
 * converts a PBR material from the default metal/rough workflow to a spec/gloss workflow.
 *
 * > _**NOTICE:** The spec/gloss workflow does _not_ support other PBR extensions such as clearcoat,
 * > transmission, IOR, etc. For the complete PBR feature set and specular data, use the
 * > {@link MaterialsSpecular} extension instead, which provides specular data within a metal/rough
 * > workflow._
 *
 * ![Illustration](/media/extensions/khr-material-pbr-specular-glossiness.png)
 *
 * > _**Figure:** Components of a PBR spec/gloss material. Source: Khronos Group._
 *
 * Properties:
 * - {@link PBRSpecularGlossiness}
 *
 * ### Example
 *
 * ```typescript
 * import { MaterialsPBRSpecularGlossiness } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const specGlossExtension = document.createExtension(MaterialsPBRSpecularGlossiness);
 *
 * // Create a PBRSpecularGlossiness property.
 * const specGloss = specGlossExtension.createPBRSpecularGlossiness()
 * 	.setSpecularFactor(1.0);
 *
 * // // Assign to a Material.
 * material.setExtension('KHR_materials_pbrSpecularGlossiness', specGloss);
 * ```
 */
export declare class MaterialsPBRSpecularGlossiness extends Extension {
    readonly extensionName = "KHR_materials_pbrSpecularGlossiness";
    static readonly EXTENSION_NAME = "KHR_materials_pbrSpecularGlossiness";
    /** Creates a new PBRSpecularGlossiness property for use on a {@link Material}. */
    createPBRSpecularGlossiness(): PBRSpecularGlossiness;
    /** @hidden */
    read(context: ReaderContext): this;
    /** @hidden */
    write(context: WriterContext): this;
}
