import { Extension, GLTF, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_MATERIALS_CLEARCOAT } from '../constants';
import { Clearcoat } from './clearcoat';

const NAME = KHR_MATERIALS_CLEARCOAT;

interface ClearcoatDef {
	clearcoatFactor?: number;
	clearcoatRoughnessFactor?: number;
	clearcoatTexture?: GLTF.ITextureInfo;
	clearcoatRoughnessTexture?: GLTF.ITextureInfo;
	clearcoatNormalTexture?: GLTF.IMaterialNormalTextureInfo;
}

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

				const clearcoatDef = materialDef.extensions[NAME] as ClearcoatDef;

				// Factors.

				if (clearcoatDef.clearcoatFactor !== undefined) {
					clearcoat.setClearcoatFactor(clearcoatDef.clearcoatFactor);
				}
				if (clearcoatDef.clearcoatRoughnessFactor !== undefined) {
					clearcoat.setClearcoatRoughnessFactor(
						clearcoatDef.clearcoatRoughnessFactor
					);
				}

				// Textures.

				if (clearcoatDef.clearcoatTexture !== undefined) {
					const textureInfoDef = clearcoatDef.clearcoatTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source];
					clearcoat.setClearcoatTexture(texture);
					context.setTextureInfo(clearcoat.getClearcoatTextureInfo(), textureInfoDef);
				}
				if (clearcoatDef.clearcoatRoughnessTexture !== undefined) {
					const textureInfoDef = clearcoatDef.clearcoatRoughnessTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source];
					clearcoat.setClearcoatRoughnessTexture(texture);
					context.setTextureInfo(
						clearcoat.getClearcoatRoughnessTextureInfo(),
						textureInfoDef
					);
				}
				if (clearcoatDef.clearcoatNormalTexture !== undefined) {
					const textureInfoDef = clearcoatDef.clearcoatNormalTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source];
					clearcoat.setClearcoatNormalTexture(texture);
					context.setTextureInfo(
						clearcoat.getClearcoatNormalTextureInfo(),
						textureInfoDef
					);
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

					const clearcoatDef = materialDef.extensions[NAME] = {
						clearcoatFactor: clearcoat.getClearcoatFactor(),
						clearcoatRoughnessFactor: clearcoat.getClearcoatRoughnessFactor(),
					} as ClearcoatDef;

					// Textures.

					if (clearcoat.getClearcoatTexture()) {
						const texture = clearcoat.getClearcoatTexture();
						const textureInfo = clearcoat.getClearcoatTextureInfo();
						clearcoatDef.clearcoatTexture
							= context.createTextureInfoDef(texture, textureInfo);
					}
					if (clearcoat.getClearcoatRoughnessTexture()) {
						const texture = clearcoat.getClearcoatRoughnessTexture();
						const textureInfo = clearcoat.getClearcoatRoughnessTextureInfo();
						clearcoatDef.clearcoatRoughnessTexture
							= context.createTextureInfoDef(texture, textureInfo);
					}
					if (clearcoat.getClearcoatNormalTexture()) {
						const texture = clearcoat.getClearcoatNormalTexture();
						const textureInfo = clearcoat.getClearcoatNormalTextureInfo();
						clearcoatDef.clearcoatNormalTexture
							= context.createTextureInfoDef(texture, textureInfo);
						if (clearcoat.getClearcoatNormalScale() !== 1) {
							clearcoatDef.clearcoatNormalTexture.scale
								= clearcoat.getClearcoatNormalScale();
						}
					}
				}
			});

		return this;
	}
}
