import { Extension, GLTF, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_MATERIALS_TRANSMISSION } from '../constants';
import { Transmission } from './transmission';

const NAME = KHR_MATERIALS_TRANSMISSION;

interface TransmissionDef {
	transmissionFactor?: number;
	transmissionTexture?: GLTF.ITextureInfo;
}

/** Documentation in {@link EXTENSIONS.md}. */
export class MaterialsTransmission extends Extension {
	public readonly extensionName = NAME;
	public static readonly EXTENSION_NAME = NAME;

	public createTransmission(): Transmission {
		return new Transmission(this.doc.getGraph(), this);
	}

	public read(context: ReaderContext): this {
		const jsonDoc = context.jsonDoc;
		const materialDefs = jsonDoc.json.materials || [];
		const textureDefs = jsonDoc.json.textures || [];
		materialDefs.forEach((materialDef, materialIndex) => {
			if (materialDef.extensions && materialDef.extensions[NAME]) {
				const transmission = this.createTransmission();
				context.materials[materialIndex].setExtension(NAME, transmission);

				const transmissionDef = materialDef.extensions[NAME] as TransmissionDef;

				// Factors.

				if (transmissionDef.transmissionFactor !== undefined) {
					transmission.setTransmissionFactor(
						transmissionDef.transmissionFactor
					);
				}

				// Textures.

				if (transmissionDef.transmissionTexture !== undefined) {
					const textureInfoDef = transmissionDef.transmissionTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source];
					transmission.setTransmissionTexture(texture);
					context.setTextureInfo(
						transmission.getTransmissionTextureInfo(),
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
				const transmission = material.getExtension<Transmission>(NAME);
				if (transmission) {
					const materialIndex = context.materialIndexMap.get(material);
					const materialDef = jsonDoc.json.materials[materialIndex];
					materialDef.extensions = materialDef.extensions || {};

					// Factors.

					const transmissionDef = materialDef.extensions[NAME] = {
						transmissionFactor: transmission.getTransmissionFactor(),
					} as TransmissionDef;

					// Textures.

					if (transmission.getTransmissionTexture()) {
						const texture = transmission.getTransmissionTexture();
						const textureInfo = transmission.getTransmissionTextureInfo();
						transmissionDef.transmissionTexture
							= context.createTextureInfoDef(texture, textureInfo);
					}
				}
			});

		return this;
	}
}
