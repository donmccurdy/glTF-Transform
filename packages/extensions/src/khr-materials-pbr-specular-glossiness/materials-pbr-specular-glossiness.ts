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
		const jsonDoc = context.jsonDoc;
		const materialDefs = jsonDoc.json.materials || [];
		const textureDefs = jsonDoc.json.textures || [];
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
				}
				if (materialDef.extensions[NAME].specularGlossinessTexture !== undefined) {
					const textureInfoDef = materialDef.extensions[NAME].specularGlossinessTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source];
					specGloss.setSpecularGlossinessTexture(texture);
					context.setTextureInfo(
						specGloss.getSpecularGlossinessTextureInfo(),
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
				const specGloss = material.getExtension<PBRSpecularGlossiness>(NAME);
				if (specGloss) {
					const materialIndex = context.materialIndexMap.get(material);
					const materialDef = jsonDoc.json.materials[materialIndex];
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
						materialDef.extensions[NAME].diffuseTexture
							= context.createTextureInfoDef(texture, textureInfo);
					}
					if (specGloss.getSpecularGlossinessTexture()) {
						const texture = specGloss.getSpecularGlossinessTexture();
						const textureInfo = specGloss.getSpecularGlossinessTextureInfo();
						materialDef.extensions[NAME].specularGlossinessTexture
							= context.createTextureInfoDef(texture, textureInfo);
					}
				}
			});

		return this;
	}
}
