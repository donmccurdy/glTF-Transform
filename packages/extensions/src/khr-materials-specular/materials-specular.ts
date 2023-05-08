import { Extension, GLTF, ReaderContext, WriterContext, vec3, MathUtils } from '@gltf-transform/core';
import { KHR_MATERIALS_SPECULAR } from '../constants.js';
import { Specular } from './specular.js';

const NAME = KHR_MATERIALS_SPECULAR;

interface SpecularDef {
	specularFactor?: number;
	specularColorFactor?: vec3;
	specularTexture?: GLTF.ITextureInfo;
	specularColorTexture?: GLTF.ITextureInfo;
}

/**
 * [`KHR_materials_specular`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_specular/)
 * adjusts the strength of the specular reflection in the dielectric BRDF.
 *
 * KHRMaterialsSpecular is a better alternative to the older
 * {@link KHRMaterialsPBRSpecularGlossiness KHR_materials_pbrSpecularGlossiness} extension, and
 * provides specular information while remaining within a metal/rough PBR workflow. A
 * value of zero disables the specular reflection, resulting in a pure diffuse material.
 *
 * Properties:
 * - {@link Specular}
 *
 * ### Example
 *
 * The `KHRMaterialsSpecular` class provides a single {@link ExtensionProperty} type, `Specular`,
 * which may be attached to any {@link Material} instance. For example:
 *
 * ```typescript
 * import { KHRMaterialsSpecular, Specular } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const specularExtension = document.createExtension(KHRMaterialsSpecular);
 *
 * // Create a Specular property.
 * const specular = specularExtension.createSpecular()
 * 	.setSpecularFactor(1.0);
 *
 * // Attach the property to a Material.
 * material.setExtension('KHR_materials_specular', specular);
 * ```
 */
export class KHRMaterialsSpecular extends Extension {
	public readonly extensionName = NAME;
	public static readonly EXTENSION_NAME = NAME;

	/** Creates a new Specular property for use on a {@link Material}. */
	public createSpecular(): Specular {
		return new Specular(this.document.getGraph());
	}

	/** @hidden */
	public read(context: ReaderContext): this {
		const jsonDoc = context.jsonDoc;
		const materialDefs = jsonDoc.json.materials || [];
		const textureDefs = jsonDoc.json.textures || [];
		materialDefs.forEach((materialDef, materialIndex) => {
			if (materialDef.extensions && materialDef.extensions[NAME]) {
				const specular = this.createSpecular();
				context.materials[materialIndex].setExtension(NAME, specular);

				const specularDef = materialDef.extensions[NAME] as SpecularDef;

				// Factors.

				if (specularDef.specularFactor !== undefined) {
					specular.setSpecularFactor(specularDef.specularFactor);
				}
				if (specularDef.specularColorFactor !== undefined) {
					specular.setSpecularColorFactor(specularDef.specularColorFactor);
				}

				// Textures.

				if (specularDef.specularTexture !== undefined) {
					const textureInfoDef = specularDef.specularTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source!];
					specular.setSpecularTexture(texture);
					context.setTextureInfo(specular.getSpecularTextureInfo()!, textureInfoDef);
				}
				if (specularDef.specularColorTexture !== undefined) {
					const textureInfoDef = specularDef.specularColorTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source!];
					specular.setSpecularColorTexture(texture);
					context.setTextureInfo(specular.getSpecularColorTextureInfo()!, textureInfoDef);
				}
			}
		});

		return this;
	}

	/** @hidden */
	public write(context: WriterContext): this {
		const jsonDoc = context.jsonDoc;

		this.document
			.getRoot()
			.listMaterials()
			.forEach((material) => {
				const specular = material.getExtension<Specular>(NAME);
				if (specular) {
					const materialIndex = context.materialIndexMap.get(material)!;
					const materialDef = jsonDoc.json.materials![materialIndex];
					materialDef.extensions = materialDef.extensions || {};

					// Factors.

					const specularDef = (materialDef.extensions[NAME] = {} as SpecularDef);

					if (specular.getSpecularFactor() !== 1) {
						specularDef.specularFactor = specular.getSpecularFactor();
					}
					if (!MathUtils.eq(specular.getSpecularColorFactor(), [1, 1, 1])) {
						specularDef.specularColorFactor = specular.getSpecularColorFactor();
					}

					// Textures.

					if (specular.getSpecularTexture()) {
						const texture = specular.getSpecularTexture()!;
						const textureInfo = specular.getSpecularTextureInfo()!;
						specularDef.specularTexture = context.createTextureInfoDef(texture, textureInfo);
					}
					if (specular.getSpecularColorTexture()) {
						const texture = specular.getSpecularColorTexture()!;
						const textureInfo = specular.getSpecularColorTextureInfo()!;
						specularDef.specularColorTexture = context.createTextureInfoDef(texture, textureInfo);
					}
				}
			});

		return this;
	}
}
