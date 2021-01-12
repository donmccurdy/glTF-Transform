import { Extension, GLTF, ReaderContext, WriterContext, vec3, vec4 } from '@gltf-transform/core';
import { KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS } from '../constants';
import { PBRSpecularGlossiness } from './pbr-specular-glossiness';

const NAME = KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS;

interface SpecularGlossinessDef {
	diffuseFactor?: vec4;
	specularFactor: vec3;
	glossinessFactor: number;
	diffuseTexture?: GLTF.ITextureInfo;
	specularGlossinessTexture?: GLTF.ITextureInfo;
}

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

				const specGlossDef = materialDef.extensions[NAME] as SpecularGlossinessDef;

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
					const texture = context.textures[textureDefs[textureInfoDef.index].source];
					specGloss.setDiffuseTexture(texture);
					context.setTextureInfo(specGloss.getDiffuseTextureInfo(), textureInfoDef);
				}
				if (specGlossDef.specularGlossinessTexture !== undefined) {
					const textureInfoDef = specGlossDef.specularGlossinessTexture;
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

					const specGlossDef = materialDef.extensions[NAME] = {
						diffuseFactor: specGloss.getDiffuseFactor(),
						specularFactor: specGloss.getSpecularFactor(),
						glossinessFactor: specGloss.getGlossinessFactor(),
					} as SpecularGlossinessDef;

					// Textures.

					if (specGloss.getDiffuseTexture()) {
						const texture = specGloss.getDiffuseTexture();
						const textureInfo = specGloss.getDiffuseTextureInfo();
						specGlossDef.diffuseTexture
							= context.createTextureInfoDef(texture, textureInfo);
					}
					if (specGloss.getSpecularGlossinessTexture()) {
						const texture = specGloss.getSpecularGlossinessTexture();
						const textureInfo = specGloss.getSpecularGlossinessTextureInfo();
						specGlossDef.specularGlossinessTexture
							= context.createTextureInfoDef(texture, textureInfo);
					}
				}
			});

		return this;
	}
}
