import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_MATERIALS_CLEARCOAT } from '../constants';
import { Clearcoat } from './clearcoat';

const NAME = KHR_MATERIALS_CLEARCOAT;

/** Documentation in {@link EXTENSIONS.md}. */
export class MaterialsClearcoat extends Extension {
	public readonly extensionName = NAME;
	public static readonly EXTENSION_NAME = NAME;

	public createClearcoat(): Clearcoat {
		return new Clearcoat(this.doc.getGraph(), this);
	}

	public read(context: ReaderContext): this {
		const jsonDoc = context.jsonDoc;
		const materialDefs = jsonDoc.json.materials || [];
		const textureDefs = jsonDoc.json.textures || [];
		materialDefs.forEach((materialDef, materialIndex) => {
			if (materialDef.extensions && materialDef.extensions[NAME]) {
				const clearcoat = this.createClearcoat();
				context.materials[materialIndex].setExtension(NAME, clearcoat);

				// Factors.

				if (materialDef.extensions[NAME].clearcoatFactor !== undefined) {
					clearcoat.setClearcoatFactor(materialDef.extensions[NAME].clearcoatFactor);
				}
				if (materialDef.extensions[NAME].clearcoatRoughnessFactor !== undefined) {
					clearcoat.setClearcoatRoughnessFactor(materialDef.extensions[NAME].clearcoatRoughnessFactor);
				}

				// Textures.

				if (materialDef.extensions[NAME].clearcoatTexture !== undefined) {
					const textureInfoDef = materialDef.extensions[NAME].clearcoatTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source];
					clearcoat.setClearcoatTexture(texture);
					context.setTextureInfo(clearcoat.getClearcoatTextureInfo(), textureInfoDef);
				}
				if (materialDef.extensions[NAME].clearcoatRoughnessTexture !== undefined) {
					const textureInfoDef = materialDef.extensions[NAME].clearcoatRoughnessTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source];
					clearcoat.setClearcoatRoughnessTexture(texture);
					context.setTextureInfo(clearcoat.getClearcoatRoughnessTextureInfo(), textureInfoDef);;
				}
				if (materialDef.extensions[NAME].clearcoatNormalTexture !== undefined) {
					const textureInfoDef = materialDef.extensions[NAME].clearcoatNormalTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source];
					clearcoat.setClearcoatNormalTexture(texture);
					context.setTextureInfo(clearcoat.getClearcoatNormalTextureInfo(), textureInfoDef);
					if (textureInfoDef.scale !== undefined) {
						clearcoat.setClearcoatNormalScale(textureInfoDef.scale);
					}
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
				const clearcoat = material.getExtension<Clearcoat>(NAME);
				if (clearcoat) {
					const materialIndex = context.materialIndexMap.get(material);
					const materialDef = jsonDoc.json.materials[materialIndex];
					materialDef.extensions = materialDef.extensions || {};

					// Factors.

					materialDef.extensions[NAME] = {
						clearcoatFactor: clearcoat.getClearcoatFactor(),
						clearcoatRoughnessFactor: clearcoat.getClearcoatRoughnessFactor(),
					};

					// Textures.

					if (clearcoat.getClearcoatTexture()) {
						const texture = clearcoat.getClearcoatTexture();
						const textureInfo = clearcoat.getClearcoatTextureInfo();
						materialDef.extensions[NAME].clearcoatTexture = context.createTextureInfoDef(texture, textureInfo);
					}
					if (clearcoat.getClearcoatRoughnessTexture()) {
						const texture = clearcoat.getClearcoatRoughnessTexture();
						const textureInfo = clearcoat.getClearcoatRoughnessTextureInfo();
						materialDef.extensions[NAME].clearcoatRoughnessTexture = context.createTextureInfoDef(texture, textureInfo);
					}
					if (clearcoat.getClearcoatNormalTexture()) {
						const texture = clearcoat.getClearcoatNormalTexture();
						const textureInfo = clearcoat.getClearcoatNormalTextureInfo();
						materialDef.extensions[NAME].clearcoatNormalTexture = context.createTextureInfoDef(texture, textureInfo);
						if (clearcoat.getClearcoatNormalScale() !== 1) {
							materialDef.extensions[NAME].clearcoatNormalTexture.scale = clearcoat.getClearcoatNormalScale();
						}
					}
				}
			});

		return this;
	}
}
