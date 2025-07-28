import { Extension, type GLTF, type ReaderContext, type vec3, type WriterContext } from '@gltf-transform/core';
import { KHR_MATERIALS_DIFFUSE_TRANSMISSION } from '../constants.js';
import { DiffuseTransmission } from './diffuse-transmission.js';

interface DiffuseTransmissionDef {
	diffuseTransmissionFactor?: number;
	diffuseTransmissionTexture?: GLTF.ITextureInfo;
	diffuseTransmissionColorFactor?: vec3;
	diffuseTransmissionColorTexture?: GLTF.ITextureInfo;
}

/**
 * [KHR_materials_diffuse_transmission](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_diffuse_transmission/)
 * defines diffuse transmission on a glTF PBR material.
 *
 * ![Illustration](/media/extensions/khr-materials-diffuse-transmission.png)
 *
 * > _**Figure:** Sphere using `KHR_materials_diffuse_transmission` with varying roughness (0.0, 0.2, 0.4).
 * > Source: Khronos Group._
 *
 * Adds a Lambertian diffuse transmission BSDF to the metallic-roughness
 * material. Thin, dielectric objects like leaves or paper diffusely transmit
 * incoming light to the opposite side of the surface. For optically thick
 * media (volumes) with short scattering distances and therefore dense
 * scattering behavior, a diffuse transmission lobe is a phenomenological
 * plausible and cheap approximation.
 *
 * Properties:
 * - {@link DiffuseTransmission}
 *
 * ### Example
 *
 * ```typescript
 * import { KHRMaterialsDiffuseTransmission, DiffuseTransmission } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const diffuseTransmissionExtension = document.createExtension(KHRMaterialsDiffuseTransmission);
 *
 * // Create DiffuseTransmission property.
 * const diffuseTransmission = diffuseTransmission.createDiffuseTransmission()
 *	.setDiffuseTransmissionFactor(1.0);
 *
 * // Assign to a Material.
 * material.setExtension('KHR_materials_diffuse_transmission', diffuseTransmission);
 * ```
 *
 * @experimental KHR_materials_diffuse_transmission is not yet ratified by the Khronos Group.
 */
export class KHRMaterialsDiffuseTransmission extends Extension {
	public readonly extensionName: typeof KHR_MATERIALS_DIFFUSE_TRANSMISSION = KHR_MATERIALS_DIFFUSE_TRANSMISSION;
	public static readonly EXTENSION_NAME: typeof KHR_MATERIALS_DIFFUSE_TRANSMISSION =
		KHR_MATERIALS_DIFFUSE_TRANSMISSION;

	/** Creates a new DiffuseTransmission property for use on a {@link Material}. */
	public createDiffuseTransmission(): DiffuseTransmission {
		return new DiffuseTransmission(this.document.getGraph());
	}

	/** @hidden */
	public read(context: ReaderContext): this {
		const jsonDoc = context.jsonDoc;
		const materialDefs = jsonDoc.json.materials || [];
		const textureDefs = jsonDoc.json.textures || [];
		materialDefs.forEach((materialDef, materialIndex) => {
			if (materialDef.extensions && materialDef.extensions[KHR_MATERIALS_DIFFUSE_TRANSMISSION]) {
				const transmission = this.createDiffuseTransmission();
				context.materials[materialIndex].setExtension(KHR_MATERIALS_DIFFUSE_TRANSMISSION, transmission);

				const transmissionDef = materialDef.extensions[
					KHR_MATERIALS_DIFFUSE_TRANSMISSION
				] as DiffuseTransmissionDef;

				// Factors.

				if (transmissionDef.diffuseTransmissionFactor !== undefined) {
					transmission.setDiffuseTransmissionFactor(transmissionDef.diffuseTransmissionFactor);
				}

				if (transmissionDef.diffuseTransmissionColorFactor !== undefined) {
					transmission.setDiffuseTransmissionColorFactor(transmissionDef.diffuseTransmissionColorFactor);
				}

				// Textures.

				if (transmissionDef.diffuseTransmissionTexture !== undefined) {
					const textureInfoDef = transmissionDef.diffuseTransmissionTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source!];
					transmission.setDiffuseTransmissionTexture(texture);
					context.setTextureInfo(transmission.getDiffuseTransmissionTextureInfo()!, textureInfoDef);
				}

				if (transmissionDef.diffuseTransmissionColorTexture !== undefined) {
					const textureInfoDef = transmissionDef.diffuseTransmissionColorTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source!];
					transmission.setDiffuseTransmissionColorTexture(texture);
					context.setTextureInfo(transmission.getDiffuseTransmissionColorTextureInfo()!, textureInfoDef);
				}
			}
		});

		return this;
	}

	/** @hidden */
	public write(context: WriterContext): this {
		const jsonDoc = context.jsonDoc;

		for (const material of this.document.getRoot().listMaterials()) {
			const transmission = material.getExtension<DiffuseTransmission>(KHR_MATERIALS_DIFFUSE_TRANSMISSION);
			if (!transmission) continue;

			const materialIndex = context.materialIndexMap.get(material)!;
			const materialDef = jsonDoc.json.materials![materialIndex];
			materialDef.extensions = materialDef.extensions || {};

			// Factors.

			const transmissionDef = (materialDef.extensions[KHR_MATERIALS_DIFFUSE_TRANSMISSION] = {
				diffuseTransmissionFactor: transmission.getDiffuseTransmissionFactor(),
				diffuseTransmissionColorFactor: transmission.getDiffuseTransmissionColorFactor(),
			} as DiffuseTransmissionDef);

			// Textures.

			if (transmission.getDiffuseTransmissionTexture()) {
				const texture = transmission.getDiffuseTransmissionTexture()!;
				const textureInfo = transmission.getDiffuseTransmissionTextureInfo()!;
				transmissionDef.diffuseTransmissionTexture = context.createTextureInfoDef(texture, textureInfo);
			}

			if (transmission.getDiffuseTransmissionColorTexture()) {
				const texture = transmission.getDiffuseTransmissionColorTexture()!;
				const textureInfo = transmission.getDiffuseTransmissionColorTextureInfo()!;
				transmissionDef.diffuseTransmissionColorTexture = context.createTextureInfoDef(texture, textureInfo);
			}
		}

		return this;
	}
}
