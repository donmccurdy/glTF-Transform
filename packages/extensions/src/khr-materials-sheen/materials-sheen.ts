import { Extension, GLTF, ReaderContext, WriterContext, vec3 } from '@gltf-transform/core';
import { KHR_MATERIALS_SHEEN } from '../constants';
import { Sheen } from './sheen';

const NAME = KHR_MATERIALS_SHEEN;

interface SheenDef {
	sheenColorFactor?: vec3;
	sheenRoughnessFactor?: number;
	sheenColorTexture?: GLTF.ITextureInfo;
	sheenRoughnessTexture?: GLTF.ITextureInfo;
}

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

				const sheenDef = materialDef.extensions[NAME] as SheenDef;

				// Factors.

				if (sheenDef.sheenColorFactor !== undefined) {
					sheen.setSheenColorFactor(sheenDef.sheenColorFactor);
				}
				if (sheenDef.sheenRoughnessFactor !== undefined) {
					sheen.setSheenRoughnessFactor(
						sheenDef.sheenRoughnessFactor
					);
				}

				// Textures.

				if (sheenDef.sheenColorTexture !== undefined) {
					const textureInfoDef = sheenDef.sheenColorTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source];
					sheen.setSheenColorTexture(texture);
					context.setTextureInfo(sheen.getSheenColorTextureInfo(), textureInfoDef);
				}
				if (sheenDef.sheenRoughnessTexture !== undefined) {
					const textureInfoDef = sheenDef.sheenRoughnessTexture;
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

					const sheenDef = materialDef.extensions[NAME] = {
						sheenColorFactor: sheen.getSheenColorFactor(),
						sheenRoughnessFactor: sheen.getSheenRoughnessFactor(),
					} as SheenDef;

					// Textures.

					if (sheen.getSheenColorTexture()) {
						const texture = sheen.getSheenColorTexture();
						const textureInfo = sheen.getSheenColorTextureInfo();
						sheenDef.sheenColorTexture
							= context.createTextureInfoDef(texture, textureInfo);
					}
					if (sheen.getSheenRoughnessTexture()) {
						const texture = sheen.getSheenRoughnessTexture();
						const textureInfo = sheen.getSheenRoughnessTextureInfo();
						sheenDef.sheenRoughnessTexture
							= context.createTextureInfoDef(texture, textureInfo);
					}
				}
			});

		return this;
	}
}
