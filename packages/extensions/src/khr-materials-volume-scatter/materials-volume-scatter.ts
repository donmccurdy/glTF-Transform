import {
	Extension,
	MathUtils,
	PropertyType,
	type ReaderContext,
	type WriterContext,
	type vec3,
} from '@gltf-transform/core';
import { KHR_MATERIALS_VOLUME_SCATTER } from '../constants.js';
import { VolumeScatter } from './volume-scatter.js';

interface VolumeScatterDef {
	multiscatterColor?: vec3;
	scatterAnisotropy?: number;
}

/**
 * [KHR_materials_volume_scatter](https://github.com/KhronosGroup/glTF/pull/2453)
 * may be used to model dense subsurface scattering materials like skin or wax, building
 * on the capabilities of {@link KHRMaterialsVolume} and {@link KHRMaterialsDiffuseTransmission}.
 *
 * ![Illustration](/media/extensions/khr-materials-volume-scatter.png)
 *
 * > _**Figure:** A simple, diffuse-only material (left) and a material using dense volume
 * > scattering (right). The chosen base color and multi-scatter color are, in this example, the
 * > same. Source: Khronos Group._
 *
 * {@link KHRMaterialsVolume} defines surfaces as interfaces between volumes, and provides tools
 * for specifying attenuation via absorption in homogeneous volumes, but does not define scattering.
 * Scattering refers to wavelength-dependent redirection of light within a volume, while absorption
 * is wavelength-dependent reduction of light-energy along a path. KHRMaterialsVolumeScatter
 * extends KHRMaterialsVolume to enable scattering.
 *
 * Materials using KHRMaterialsVolumeScatter must define {@link KHRMaterialsVolume}, and must
 * also define _either_ {@link KHRMaterialsTransmission} or {@link KHRMaterialsDiffuseTransmission}.
 * For most applications, KHRMaterialsDiffuseTransmission should be preferred.
 *
 * Properties:
 * - {@link VolumeScatter}
 *
 * ### Example
 *
 * The `KHRMaterialsVolumeScatter` class provides a single {@link ExtensionProperty} type,
 * `VolumeScatter`, which may be attached to any {@link Material} instance. For example:
 *
 * ```typescript
 * import { KHRMaterialsDiffuseTransmission, KHRMaterialsVolumeScatter, KHRMaterialsVolumeScatter } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const scatterExtension = document.createExtension(KHRMaterialsVolumeScatter);
 * const volumeExtension = document.createExtension(KHRMaterialsVolume);
 * const transmissionExtension = document.createExtension(KHRMaterialsDiffuseTransmission);
 *
 * // Create a VolumeScatter property.
 * const scatter = scatterExtension.createVolumeScatter()
 * 	.setMultiscatterColor([0.572, 0.227, 0.075])
 * 	.setScatterAnisotropy(0.3);
 *
 * const volume = volumeExtension.createVolume()
 * 	.setAttenuationColor([0.9, 0.9, 0.9])
 * 	.setAttenuationDistance(0.01);
 *
 * const transmission = transmissionExtension.createDiffuseTransmission()
 * 	.setDiffuseTransmissionFactor(1.0);
 *
 * // Attach the property to a Material.
 * material
 * 	.setExtension('KHR_materials_volume_scatter', scatter)
 * 	.setExtension('KHR_materials_volume', volume)
 * 	.setExtension('KHR_materials_diffuse_transmission', transmission);
 * ```
 *
 * A thickness texture is required in most realtime renderers, and can be baked in software such as
 * Blender or Substance Painter. When `thicknessFactor = 0`, all volumetric effects are disabled.
 *
 * @experimental KHR_materials_volume_scatter is not yet ratified by the Khronos Group.
 */
export class KHRMaterialsVolumeScatter extends Extension {
	public static readonly EXTENSION_NAME: typeof KHR_MATERIALS_VOLUME_SCATTER = KHR_MATERIALS_VOLUME_SCATTER;
	public readonly extensionName: typeof KHR_MATERIALS_VOLUME_SCATTER = KHR_MATERIALS_VOLUME_SCATTER;
	public readonly prereadTypes: PropertyType[] = [PropertyType.MESH];
	public readonly prewriteTypes: PropertyType[] = [PropertyType.MESH];

	/** Creates a new VolumeScatter property for use on a {@link Material}. */
	public createVolumeScatter(): VolumeScatter {
		return new VolumeScatter(this.document.getGraph());
	}

	/** @hidden */
	public read(_context: ReaderContext): this {
		return this;
	}

	/** @hidden */
	public write(_context: WriterContext): this {
		return this;
	}

	/** @hidden */
	public preread(context: ReaderContext): this {
		const jsonDoc = context.jsonDoc;
		const materialDefs = jsonDoc.json.materials || [];
		const textureDefs = jsonDoc.json.textures || [];
		materialDefs.forEach((materialDef, materialIndex) => {
			if (materialDef.extensions && materialDef.extensions[KHR_MATERIALS_VOLUME_SCATTER]) {
				const scatter = this.createVolumeScatter();
				context.materials[materialIndex].setExtension(KHR_MATERIALS_VOLUME_SCATTER, scatter);

				const volumeDef = materialDef.extensions[KHR_MATERIALS_VOLUME_SCATTER] as VolumeScatterDef;

				// Factors.

				if (volumeDef.multiscatterColor !== undefined) {
					scatter.setMultiscatterColor(volumeDef.multiscatterColor);
				}
				if (volumeDef.scatterAnisotropy !== undefined) {
					scatter.setScatterAnisotropy(volumeDef.scatterAnisotropy);
				}
			}
		});

		return this;
	}

	/** @hidden */
	public prewrite(context: WriterContext): this {
		const jsonDoc = context.jsonDoc;

		this.document
			.getRoot()
			.listMaterials()
			.forEach((material) => {
				const scatter = material.getExtension<VolumeScatter>(KHR_MATERIALS_VOLUME_SCATTER);
				if (scatter) {
					const materialIndex = context.materialIndexMap.get(material)!;
					const materialDef = jsonDoc.json.materials![materialIndex];
					materialDef.extensions = materialDef.extensions || {};

					// Factors.

					const volumeDef = (materialDef.extensions[KHR_MATERIALS_VOLUME_SCATTER] = {} as VolumeScatterDef);

					if (!MathUtils.eq(scatter.getMultiscatterColor(), [0, 0, 0])) {
						volumeDef.multiscatterColor = scatter.getMultiscatterColor();
					}
					if (scatter.getScatterAnisotropy() > 0) {
						volumeDef.scatterAnisotropy = scatter.getScatterAnisotropy();
					}
				}
			});

		return this;
	}
}
