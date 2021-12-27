import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { Transmission } from './transmission';
/**
 * # MaterialsTransmission
 *
 * [`KHR_materials_transmission`](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_materials_transmission/)
 * provides a common type of optical transparency: infinitely-thin materials with no refraction,
 * scattering, or dispersion.
 *
 * While default PBR materials using alpha blending become invisible as their opacity approaches
 * zero, a transmissive material continues to reflect light in a glass-like manner, even at low
 * transmission values. When combined with {@link MaterialsVolume}, transmission may be used for
 * thicker materials and refractive effects.
 *
 * Properties:
 * - {@link Transmission}
 *
 * ### Example
 *
 * The `MaterialsTransmission` class provides a single {@link ExtensionProperty} type,
 * `Transmission`, which may be attached to any {@link Material} instance. For example:
 *
 * ```typescript
 * import { MaterialsTransmission, Transmission } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const transmissionExtension = document.createExtension(MaterialsTransmission);
 *
 * // Create a Transmission property.
 * const transmission = transmissionExtension.createTransmission()
 * 	.setTransmissionFactor(1.0);
 *
 * // Attach the property to a Material.
 * material.setExtension('KHR_materials_transmission', transmission);
 * ```
 */
export declare class MaterialsTransmission extends Extension {
    readonly extensionName = "KHR_materials_transmission";
    static readonly EXTENSION_NAME = "KHR_materials_transmission";
    /** Creates a new Transmission property for use on a {@link Material}. */
    createTransmission(): Transmission;
    /** @hidden */
    read(context: ReaderContext): this;
    /** @hidden */
    write(context: WriterContext): this;
}
