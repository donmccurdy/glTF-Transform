import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS } from '../constants';
import { PBRSpecularGlossiness } from './pbr-specular-glossiness';

const NAME = KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS;

/** Documentation in {@link EXTENSIONS.md}. */
export class MaterialsPBRSpecularGlossiness extends Extension {
	public readonly extensionName = NAME;
	public static readonly EXTENSION_NAME = NAME;

	public createPBRSpecularGlossiness(): PBRSpecularGlossiness {
		return new PBRSpecularGlossiness(this.doc.getGraph(), this);
	}

	public read(context: ReaderContext): this {
		const nativeDoc = context.nativeDocument;
		const materialDefs = nativeDoc.json.materials || [];
		const textureDefs = nativeDoc.json.textures || [];
		materialDefs.forEach((materialDef, materialIndex) => {
			if (materialDef.extensions && materialDef.extensions[NAME]) {
				const specGloss = this.createPBRSpecularGlossiness();
				context.materials[materialIndex].setExtension(NAME, specGloss);

				// Factors.

				if (materialDef.extensions[NAME].diffuseFactor !== undefined) {
					specGloss.setDiffuseFactor(materialDef.extensions[NAME].diffuseFactor);
				}
				if (materialDef.extensions[NAME].specularFactor !== undefined) {
					specGloss.setSpecularFactor(materialDef.extensions[NAME].specularFactor);
				}
				if (materialDef.extensions[NAME].glossinessFactor !== undefined) {
					specGloss.setGlossinessFactor(materialDef.extensions[NAME].glossinessFactor);
				}

				// Textures.

				if (materialDef.extensions[NAME].diffuseTexture !== undefined) {
					const textureInfoDef = materialDef.extensions[NAME].diffuseTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source];
					specGloss.setDiffuseTexture(texture);
					context.setTextureInfo(specGloss.getDiffuseTextureInfo(), textureInfoDef);
					context.setTextureSampler(specGloss.getDiffuseTextureSampler(), textureInfoDef);
				}
				if (materialDef.extensions[NAME].specularGlossinessTexture !== undefined) {
					const textureInfoDef = materialDef.extensions[NAME].specularGlossinessTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source];
					specGloss.setSpecularGlossinessTexture(texture);
					context.setTextureInfo(specGloss.getSpecularGlossinessTextureInfo(), textureInfoDef);
					context.setTextureSampler(specGloss.getSpecularGlossinessTextureSampler(), textureInfoDef);
				}
			}
		});

		return this;
	}

	public write(context: WriterContext): this {
		const nativeDoc = context.nativeDocument;

		this.doc.getRoot()
			.listMaterials()
			.forEach((material) => {
				const specGloss = material.getExtension<PBRSpecularGlossiness>(NAME);
				if (specGloss) {
					const materialIndex = context.materialIndexMap.get(material);
					const materialDef = nativeDoc.json.materials[materialIndex];
					materialDef.extensions = materialDef.extensions || {};

					// Factors.

					materialDef.extensions[NAME] = {
						diffuseFactor: specGloss.getDiffuseFactor(),
						specularFactor: specGloss.getSpecularFactor(),
						glossinessFactor: specGloss.getGlossinessFactor(),
					};

					// Textures.

					if (specGloss.getDiffuseTexture()) {
						const texture = specGloss.getDiffuseTexture();
						const textureInfo = specGloss.getDiffuseTextureInfo();
						const textureSampler = specGloss.getDiffuseTextureSampler();
						materialDef.extensions[NAME].diffuseTexture = context.createTextureInfoDef(texture, textureInfo, textureSampler);
					}
					if (specGloss.getSpecularGlossinessTexture()) {
						const texture = specGloss.getSpecularGlossinessTexture();
						const textureInfo = specGloss.getSpecularGlossinessTextureInfo();
						const textureSampler = specGloss.getSpecularGlossinessTextureSampler();
						materialDef.extensions[NAME].specularGlossinessTexture = context.createTextureInfoDef(texture, textureInfo, textureSampler);
					}
				}
			});

		return this;
	}
}
