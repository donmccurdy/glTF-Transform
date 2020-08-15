import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_MATERIALS_SPECULAR } from '../constants';
import { Specular } from './specular';

const NAME = KHR_MATERIALS_SPECULAR;

/** Documentation in {@link EXTENSIONS.md}. */
export class MaterialsSpecular extends Extension {
	public readonly extensionName = NAME;
	public static readonly EXTENSION_NAME = NAME;

	public createSpecular(): Specular {
		return new Specular(this.doc.getGraph(), this);
	}

	public read(context: ReaderContext): this {
		const nativeDoc = context.nativeDocument;
		const materialDefs = nativeDoc.json.materials || [];
		const textureDefs = nativeDoc.json.textures || [];
		materialDefs.forEach((materialDef, materialIndex) => {
			if (materialDef.extensions && materialDef.extensions[NAME]) {
				const specular = this.createSpecular();
				context.materials[materialIndex].setExtension(Specular, specular);

				// Factors.

				if (materialDef.extensions[NAME].specularFactor !== undefined) {
					specular.setSpecularFactor(materialDef.extensions[NAME].specularFactor);
				}
				if (materialDef.extensions[NAME].specularColorFactor !== undefined) {
					specular.setSpecularColorFactor(materialDef.extensions[NAME].specularColorFactor);
				}

				// Textures.

				if (materialDef.extensions[NAME].specularTexture !== undefined) {
					const textureInfoDef = materialDef.extensions[NAME].specularTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source];
					specular.setSpecularTexture(texture);
					context.setTextureInfo(specular.getSpecularTextureInfo(), textureInfoDef);
					context.setTextureSampler(specular.getSpecularTextureSampler(), textureInfoDef);
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
				const specular = material.getExtension(Specular);
				if (specular) {
					const materialIndex = context.materialIndexMap.get(material);
					const materialDef = nativeDoc.json.materials[materialIndex];
					materialDef.extensions = materialDef.extensions || {};

					// Factors.

					materialDef.extensions[NAME] = {
						specularFactor: specular.getSpecularFactor(),
						specularColorFactor: specular.getSpecularColorFactor(),
					};

					// Textures.

					if (specular.getSpecularTexture()) {
						const texture = specular.getSpecularTexture();
						const textureInfo = specular.getSpecularTextureInfo();
						const textureSampler = specular.getSpecularTextureSampler();
						materialDef.extensions[NAME].specularTexture = context.createTextureInfoDef(texture, textureInfo, textureSampler);
					}
				}
			});

		return this;
	}
}
