import {
	Extension,
	type GLTF,
	PropertyType,
	type ReaderContext,
	type vec3,
	type vec4,
	type WriterContext,
} from '@gltf-transform/core';
import { KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS } from '../constants.js';
import { PBRSpecularGlossiness } from './pbr-specular-glossiness.js';

interface SpecularGlossinessDef {
	diffuseFactor?: vec4;
	specularFactor: vec3;
	glossinessFactor: number;
	diffuseTexture?: GLTF.ITextureInfo;
	specularGlossinessTexture?: GLTF.ITextureInfo;
}

/**
 * [`KHR_materials_pbrSpecularGlossiness`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_pbrSpecularGlossiness/)
 * converts a PBR material from the default metal/rough workflow to a spec/gloss workflow.
 *
 * > _**NOTICE:** The spec/gloss workflow does _not_ support other PBR extensions such as clearcoat,
 * > transmission, IOR, etc. For the complete PBR feature set and specular data, use the
 * > {@link KHRMaterialsSpecular} extension instead, which provides specular data within a metal/rough
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
 * import { KHRMaterialsPBRSpecularGlossiness } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const specGlossExtension = document.createExtension(KHRMaterialsPBRSpecularGlossiness);
 *
 * // Create a PBRSpecularGlossiness property.
 * const specGloss = specGlossExtension.createPBRSpecularGlossiness()
 * 	.setSpecularFactor(1.0);
 *
 * // // Assign to a Material.
 * material.setExtension('KHR_materials_pbrSpecularGlossiness', specGloss);
 * ```
 */
export class KHRMaterialsPBRSpecularGlossiness extends Extension {
	public static readonly EXTENSION_NAME: typeof KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS =
		KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS;
	public readonly extensionName: typeof KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS = KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS;
	public readonly prereadTypes: PropertyType[] = [PropertyType.MESH];
	public readonly prewriteTypes: PropertyType[] = [PropertyType.MESH];

	/** Creates a new PBRSpecularGlossiness property for use on a {@link Material}. */
	public createPBRSpecularGlossiness(): PBRSpecularGlossiness {
		return new PBRSpecularGlossiness(this.document.getGraph());
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
			if (materialDef.extensions && materialDef.extensions[KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS]) {
				const specGloss = this.createPBRSpecularGlossiness();
				context.materials[materialIndex].setExtension(KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS, specGloss);

				const specGlossDef = materialDef.extensions[
					KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS
				] as SpecularGlossinessDef;

				// Factors.

				if (specGlossDef.diffuseFactor !== undefined) {
					specGloss.setDiffuseFactor(specGlossDef.diffuseFactor);
				}
				if (specGlossDef.specularFactor !== undefined) {
					specGloss.setSpecularFactor(specGlossDef.specularFactor);
				}
				if (specGlossDef.glossinessFactor !== undefined) {
					specGloss.setGlossinessFactor(specGlossDef.glossinessFactor);
				}

				// Textures.

				if (specGlossDef.diffuseTexture !== undefined) {
					const textureInfoDef = specGlossDef.diffuseTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source!];
					specGloss.setDiffuseTexture(texture);
					context.setTextureInfo(specGloss.getDiffuseTextureInfo()!, textureInfoDef);
				}
				if (specGlossDef.specularGlossinessTexture !== undefined) {
					const textureInfoDef = specGlossDef.specularGlossinessTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source!];
					specGloss.setSpecularGlossinessTexture(texture);
					context.setTextureInfo(specGloss.getSpecularGlossinessTextureInfo()!, textureInfoDef);
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
				const specGloss = material.getExtension<PBRSpecularGlossiness>(KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS);
				if (specGloss) {
					const materialIndex = context.materialIndexMap.get(material)!;
					const materialDef = jsonDoc.json.materials![materialIndex];
					materialDef.extensions = materialDef.extensions || {};

					// Factors.

					const specGlossDef = (materialDef.extensions[KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS] = {
						diffuseFactor: specGloss.getDiffuseFactor(),
						specularFactor: specGloss.getSpecularFactor(),
						glossinessFactor: specGloss.getGlossinessFactor(),
					} as SpecularGlossinessDef);

					// Textures.

					if (specGloss.getDiffuseTexture()) {
						const texture = specGloss.getDiffuseTexture()!;
						const textureInfo = specGloss.getDiffuseTextureInfo()!;
						specGlossDef.diffuseTexture = context.createTextureInfoDef(texture, textureInfo);
					}
					if (specGloss.getSpecularGlossinessTexture()) {
						const texture = specGloss.getSpecularGlossinessTexture()!;
						const textureInfo = specGloss.getSpecularGlossinessTextureInfo()!;
						specGlossDef.specularGlossinessTexture = context.createTextureInfoDef(texture, textureInfo);
					}
				}
			});

		return this;
	}
}
