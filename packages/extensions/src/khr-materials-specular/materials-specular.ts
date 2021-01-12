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
		const jsonDoc = context.jsonDoc;
		const materialDefs = jsonDoc.json.materials || [];
		const textureDefs = jsonDoc.json.textures || [];
		materialDefs.forEach((materialDef, materialIndex) => {
			if (materialDef.extensions && materialDef.extensions[NAME]) {
				const specular = this.createSpecular();
				context.materials[materialIndex].setExtension(NAME, specular);

				// Factors.

				if (materialDef.extensions[NAME].specularFactor !== undefined) {
					specular.setSpecularFactor(materialDef.extensions[NAME].specularFactor);
				}
				if (materialDef.extensions[NAME].specularColorFactor !== undefined) {
					specular.setSpecularColorFactor(
						materialDef.extensions[NAME].specularColorFactor
					);
				}

				// Textures.

				if (materialDef.extensions[NAME].specularTexture !== undefined) {
					const textureInfoDef = materialDef.extensions[NAME].specularTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source];
					specular.setSpecularTexture(texture);
					context.setTextureInfo(specular.getSpecularTextureInfo(), textureInfoDef);
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
				const specular = material.getExtension<Specular>(NAME);
				if (specular) {
					const materialIndex = context.materialIndexMap.get(material);
					const materialDef = jsonDoc.json.materials[materialIndex];
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
						materialDef.extensions[NAME].specularTexture
							= context.createTextureInfoDef(texture, textureInfo);
					}
				}
			});

		return this;
	}
}
