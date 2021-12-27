import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { Volume } from './volume';
/**
 * # MaterialsVolume
 *
 * [KHR_materials_volume](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_materials_volume/)
 * adds refraction, absorption, or scattering to a glTF PBR material already using transmission or
 * translucency.
 *
 * ![Illustration](/media/extensions/khr-materials-volume.png)
 *
 * > _**Figure:** Base color changes the amount of light passing through the volume boundary
 * > (left). The overall color of the object is the same everywhere, as if the object is covered
 * > with a colored, transparent foil. Absorption changes the amount of light traveling through the
 * > volume (right). The overall color depends on the distance the light traveled through it; at
 * > small distances (tail of the dragon) less light is absorbed and the color is brighter than at
 * > large distances. Source: Khronos Group._
 *
 * By default, a glTF 2.0 material describes the scattering properties of a surface enclosing an
 * infinitely thin volume. The surface defined by the mesh represents a thin wall. The volume
 * extension makes it possible to turn the surface into an interface between volumes. The mesh to
 * which the material is attached defines the boundaries of an homogeneous medium and therefore must
 * be manifold. Volumes provide effects like refraction, absorption and scattering. Scattering
 * effects will require future (TBD) extensions.
 *
 * The volume extension must be combined with {@link MaterialsTransmission} or
 * `KHR_materials_translucency` in order to define entry of light into the volume.
 *
 * Properties:
 * - {@link Volume}
 *
 * ### Example
 *
 * The `MaterialsVolume` class provides a single {@link ExtensionProperty} type, `Volume`, which
 * may be attached to any {@link Material} instance. For example:
 *
 * ```typescript
 * import { MaterialsVolume, Volume } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const volumeExtension = document.createExtension(MaterialsVolume);
 *
 * // Create a Volume property.
 * const volume = volumeExtension.createVolume()
 * 	.setThicknessFactor(1.0)
 * 	.setThicknessTexture(texture)
 * 	.setAttenuationDistance(1.0)
 * 	.setAttenuationColorHex(0xFFEEEE);
 *
 * // Attach the property to a Material.
 * material.setExtension('KHR_materials_volume', volume);
 * ```
 *
 * A thickness texture is required in most realtime renderers, and can be baked in software such as
 * Blender or Substance Painter. When `thicknessFactor = 0`, all volumetric effects are disabled.
 */
export declare class MaterialsVolume extends Extension {
    readonly extensionName = "KHR_materials_volume";
    static readonly EXTENSION_NAME = "KHR_materials_volume";
    /** Creates a new Volume property for use on a {@link Material}. */
    createVolume(): Volume;
    /** @hidden */
    read(context: ReaderContext): this;
    /** @hidden */
    write(context: WriterContext): this;
}
