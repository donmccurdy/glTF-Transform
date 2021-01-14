import { Extension, GLTF, ReaderContext, WriterContext, vec3 } from '@gltf-transform/core';
import { KHR_MATERIALS_VOLUME } from '../constants';
import { Volume } from './volume';

const NAME = KHR_MATERIALS_VOLUME;

interface VolumeDef {
	thicknessFactor?: number;
	thicknessTexture?: GLTF.ITextureInfo;
	attenuationDistance?: number;
	attenuationColor?: vec3;
}

/** Documentation in {@link EXTENSIONS.md}. */
export class MaterialsVolume extends Extension {
	public readonly extensionName = NAME;
	public static readonly EXTENSION_NAME = NAME;

	public createVolume(): Volume {
		return new Volume(this.doc.getGraph(), this);
	}

	public read(context: ReaderContext): this {
		const jsonDoc = context.jsonDoc;
		const materialDefs = jsonDoc.json.materials || [];
		const textureDefs = jsonDoc.json.textures || [];
		materialDefs.forEach((materialDef, materialIndex) => {
			if (materialDef.extensions && materialDef.extensions[NAME]) {
				const volume = this.createVolume();
				context.materials[materialIndex].setExtension(NAME, volume);

				const volumeDef = materialDef.extensions[NAME] as VolumeDef;

				// Factors.

				if (volumeDef.thicknessFactor !== undefined) {
					volume.setThicknessFactor(volumeDef.thicknessFactor);
				}
				if (volumeDef.attenuationDistance !== undefined) {
					volume.setAttenuationDistance(volumeDef.attenuationDistance);
				}
				if (volumeDef.attenuationColor !== undefined) {
					volume.setAttenuationColor(volumeDef.attenuationColor);
				}

				// Textures.

				if (volumeDef.thicknessTexture !== undefined) {
					const textureInfoDef = volumeDef.thicknessTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source];
					volume.setThicknessTexture(texture);
					context.setTextureInfo(
						volume.getThicknessTextureInfo(),
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
				const volume = material.getExtension<Volume>(NAME);
				if (volume) {
					const materialIndex = context.materialIndexMap.get(material);
					const materialDef = jsonDoc.json.materials[materialIndex];
					materialDef.extensions = materialDef.extensions || {};

					// Factors.

					const volumeDef = materialDef.extensions[NAME] = {
						thicknessFactor: volume.getThicknessFactor(),
						attenuationDistance: volume.getAttenuationDistance(),
						attenuationColor: volume.getAttenuationColor(),
					} as VolumeDef;

					// Textures.

					if (volume.getThicknessTexture()) {
						const texture = volume.getThicknessTexture();
						const textureInfo = volume.getThicknessTextureInfo();
						volumeDef.thicknessTexture
							= context.createTextureInfoDef(texture, textureInfo);
					}
				}
			});

		return this;
	}
}
