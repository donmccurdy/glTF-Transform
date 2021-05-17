import { Extension, GLTF, ReaderContext, WriterContext, vec3 } from '@gltf-transform/core';
import { KHR_MATERIALS_VOLUME } from '../constants';
import { Volume } from './volume';

const NAME = KHR_MATERIALS_VOLUME;

interface VolumeDef {
	thicknessFactor?: number;
	thicknessTexture?: GLTF.ITextureInfo;
	attenuationDistance?: number;
	attenuationColor?: vec3;
}

/**
 * # MaterialsVolume
 *
 * [KHR_materials_volume](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_materials_volume/)
 * adds refraction, absorption, or scattering to a glTF PBR material already using transmission or
 * translucency.
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
export class MaterialsVolume extends Extension {
	public readonly extensionName = NAME;
	public static readonly EXTENSION_NAME = NAME;

	public createVolume(): Volume {
		return new Volume(this.doc.getGraph(), this);
	}

	public read(context: ReaderContext): this {
		const jsonDoc = context.jsonDoc;
		const materialDefs = jsonDoc.json.materials || [];
		const textureDefs = jsonDoc.json.textures || [];
		materialDefs.forEach((materialDef, materialIndex) => {
			if (materialDef.extensions && materialDef.extensions[NAME]) {
				const volume = this.createVolume();
				context.materials[materialIndex].setExtension(NAME, volume);

				const volumeDef = materialDef.extensions[NAME] as VolumeDef;

				// Factors.

				if (volumeDef.thicknessFactor !== undefined) {
					volume.setThicknessFactor(volumeDef.thicknessFactor);
				}
				if (volumeDef.attenuationDistance !== undefined) {
					volume.setAttenuationDistance(volumeDef.attenuationDistance);
				}
				if (volumeDef.attenuationColor !== undefined) {
					volume.setAttenuationColor(volumeDef.attenuationColor);
				}

				// Textures.

				if (volumeDef.thicknessTexture !== undefined) {
					const textureInfoDef = volumeDef.thicknessTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source!];
					volume.setThicknessTexture(texture);
					context.setTextureInfo(
						volume.getThicknessTextureInfo()!,
						textureInfoDef
					);
				}
			}
		});

		return this;
	}

	public write(context: WriterContext): this {
		const jsonDoc = context.jsonDoc;

		this.doc.getRoot()
			.listMaterials()
			.forEach((material) => {
				const volume = material.getExtension<Volume>(NAME);
				if (volume) {
					const materialIndex = context.materialIndexMap.get(material)!;
					const materialDef = jsonDoc.json.materials![materialIndex];
					materialDef.extensions = materialDef.extensions || {};

					// Factors.

					const volumeDef = materialDef.extensions[NAME] = {
						thicknessFactor: volume.getThicknessFactor(),
						attenuationDistance: volume.getAttenuationDistance(),
						attenuationColor: volume.getAttenuationColor(),
					} as VolumeDef;

					// Textures.

					if (volume.getThicknessTexture()) {
						const texture = volume.getThicknessTexture()!;
						const textureInfo = volume.getThicknessTextureInfo()!;
						volumeDef.thicknessTexture
							= context.createTextureInfoDef(texture, textureInfo);
					}
				}
			});

		return this;
	}
}
