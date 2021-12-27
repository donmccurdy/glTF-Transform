import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { EmissiveStrength } from './emissive-strength';
/**
 * # MaterialsEmissiveStrength
 *
 * [KHR_materials_emissive_strength](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_materials_emissive_strength/)
 * defines emissive strength and enables high-dynamic-range (HDR) emissive materials.
 *
 * [[include:UNRATIFIED_EXTENSIONS_NOTE.md]]
 *
 * The core glTF 2.0 material model includes {@link Material.setEmissiveFactor `emissiveFactor`}
 * and {@link Material.setEmissiveTexture `emissiveTexture`} to control the color and intensity
 * of the light being emitted by the material, clamped to the range [0.0, 1.0]. However, in
 * PBR environments with HDR reflections and lighting, stronger emission effects may be desirable.
 *
 * In this extension, a new {@link EmissiveStrength.setEmissiveStrength `emissiveStrength`} scalar
 * factor is supplied, which governs the upper limit of emissive strength per material and may be
 * given arbitrarily high values.
 *
 * For implementations where a physical light unit is needed, the units for the multiplicative
 * product of the emissive texture and factor are candela per square meter (cd / m2), sometimes
 * called _nits_. Many realtime rendering engines simplify this calculation by assuming that an
 * emissive factor of 1.0 results in a fully exposed pixel.
 *
 * Properties:
 * - {@link EmissiveStrength}
 *
 * ### Example
 *
 * ```typescript
 * import { MaterialsEmissiveStrength, EmissiveStrength } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const emissiveStrengthExtension = document.createExtension(MaterialsEmissiveStrength);
 *
 * // Create EmissiveStrength property.
 * const emissiveStrength = emissiveStrengthExtension
 * 	.createEmissiveStrength().setEmissiveStrength(5.0);
 *
 * // Assign to a Material.
 * material.setExtension('KHR_materials_emissive_strength', emissiveStrength);
 * ```
 */
export declare class MaterialsEmissiveStrength extends Extension {
    readonly extensionName = "KHR_materials_emissive_strength";
    static readonly EXTENSION_NAME = "KHR_materials_emissive_strength";
    /** Creates a new EmissiveStrength property for use on a {@link Material}. */
    createEmissiveStrength(): EmissiveStrength;
    /** @hidden */
    read(context: ReaderContext): this;
    /** @hidden */
    write(context: WriterContext): this;
}
