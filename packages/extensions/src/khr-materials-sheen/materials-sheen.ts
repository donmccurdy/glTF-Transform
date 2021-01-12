import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_MATERIALS_SHEEN } from '../constants';
import { Sheen } from './sheen';

const NAME = KHR_MATERIALS_SHEEN;

/** Documentation in {@link EXTENSIONS.md}. */
export class MaterialsSheen extends Extension {
	public readonly extensionName = NAME;
	public static readonly EXTENSION_NAME = NAME;

	public createSheen(): Sheen {
		return new Sheen(this.doc.getGraph(), this);
	}

	public read(context: ReaderContext): this {
		const jsonDoc = context.jsonDoc;
		const materialDefs = jsonDoc.json.materials || [];
		const textureDefs = jsonDoc.json.textures || [];
		materialDefs.forEach((materialDef, materialIndex) => {
			if (materialDef.extensions && materialDef.extensions[NAME]) {
				const sheen = this.createSheen();
				context.materials[materialIndex].setExtension(NAME, sheen);

				// Factors.

				if (materialDef.extensions[NAME].sheenColorFactor !== undefined) {
					sheen.setSheenColorFactor(materialDef.extensions[NAME].sheenColorFactor);
				}
				if (materialDef.extensions[NAME].sheenRoughnessFactor !== undefined) {
					sheen.setSheenRoughnessFactor(materialDef.extensions[NAME].sheenRoughnessFactor);
				}

				// Textures.

				if (materialDef.extensions[NAME].sheenColorTexture !== undefined) {
					const textureInfoDef = materialDef.extensions[NAME].sheenColorTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source];
					sheen.setSheenColorTexture(texture);
					context.setTextureInfo(sheen.getSheenColorTextureInfo(), textureInfoDef);
				}
				if (materialDef.extensions[NAME].sheenRoughnessTexture !== undefined) {
					const textureInfoDef = materialDef.extensions[NAME].sheenRoughnessTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source];
					sheen.setSheenRoughnessTexture(texture);
					context.setTextureInfo(sheen.getSheenRoughnessTextureInfo(), textureInfoDef);
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
				const sheen = material.getExtension<Sheen>(NAME);
				if (sheen) {
					const materialIndex = context.materialIndexMap.get(material);
					const materialDef = jsonDoc.json.materials[materialIndex];
					materialDef.extensions = materialDef.extensions || {};

					// Factors.

					materialDef.extensions[NAME] = {
						sheenColorFactor: sheen.getSheenColorFactor(),
						sheenRoughnessFactor: sheen.getSheenRoughnessFactor(),
					};

					// Textures.

					if (sheen.getSheenColorTexture()) {
						const texture = sheen.getSheenColorTexture();
						const textureInfo = sheen.getSheenColorTextureInfo();
						materialDef.extensions[NAME].sheenColorTexture = context.createTextureInfoDef(texture, textureInfo);
					}
					if (sheen.getSheenRoughnessTexture()) {
						const texture = sheen.getSheenRoughnessTexture();
						const textureInfo = sheen.getSheenRoughnessTextureInfo();
						materialDef.extensions[NAME].sheenRoughnessTexture = context.createTextureInfoDef(texture, textureInfo);
					}
				}
			});

		return this;
	}
}
