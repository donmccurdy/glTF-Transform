import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { Light } from './light';
/**
 * # LightsPunctual
 *
 * [`KHR_lights_punctual`](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_lights_punctual/) defines three "punctual" light types: directional, point and
 * spot.
 *
 * Punctual lights are parameterized, infinitely small points that emit light in
 * well-defined directions and intensities. Lights are referenced by nodes and inherit the transform
 * of that node.
 *
 * Properties:
 * - {@link Light}
 *
 * ### Example
 *
 * ```typescript
 * import { LightsPunctual, Light, LightType } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const lightsExtension = document.createExtension(LightsPunctual);
 *
 * // Create a Light property.
 * const light = lightsExtension.createLight()
 *	.setType(LightType.POINT)
 *	.setIntensity(2.0)
 *	.setColor([1.0, 0.0, 0.0]);
 *
 * // Attach the property to a Material.
 * node.setExtension('KHR_lights_punctual', light);
 * ```
 */
export declare class LightsPunctual extends Extension {
    readonly extensionName = "KHR_lights_punctual";
    static readonly EXTENSION_NAME = "KHR_lights_punctual";
    /** Creates a new punctual Light property for use on a {@link Node}. */
    createLight(name?: string): Light;
    /** @hidden */
    read(context: ReaderContext): this;
    /** @hidden */
    write(context: WriterContext): this;
}
