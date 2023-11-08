import { Extension, GLTF, ReaderContext, WriterContext, vec3 } from '@gltf-transform/core';
import { KHR_MATERIALS_DIFFUSE_TRANSMISSION } from '../constants.js';
import { DiffuseTransmission } from './diffuse-transmission.js';

const NAME = KHR_MATERIALS_DIFFUSE_TRANSMISSION;

interface DiffuseTransmissionDef {
	diffuseTransmissionFactor?: number;
	diffuseTransmissionTexture?: GLTF.ITextureInfo;
	diffuseTransmissionColorFactor?: vec3;
	diffuseTransmissionColorTexture?: GLTF.ITextureInfo;
}

/**
 * TODO
 */
export class KHRMaterialsDiffuseTransmission extends Extension {
	public readonly extensionName = NAME;
	public static readonly EXTENSION_NAME = NAME;

	/** Creates a new DiffuseTransmission property for use on a {@link Material}. */
	public createDiffuseTransmission(): DiffuseTransmission {
		return new DiffuseTransmission(this.document.getGraph());
	}

	/** @hidden */
	public read(context: ReaderContext): this {
		const jsonDoc = context.jsonDoc;
		const materialDefs = jsonDoc.json.materials || [];
		const textureDefs = jsonDoc.json.textures || [];
		materialDefs.forEach((materialDef, materialIndex) => {
			if (materialDef.extensions && materialDef.extensions[NAME]) {
				const transmission = this.createDiffuseTransmission();
				context.materials[materialIndex].setExtension(NAME, transmission);

				const transmissionDef = materialDef.extensions[NAME] as DiffuseTransmissionDef;

				// Factors.

				if (transmissionDef.diffuseTransmissionFactor !== undefined) {
					transmission.setDiffuseTransmissionFactor(transmissionDef.diffuseTransmissionFactor);
				}

				if (transmissionDef.diffuseTransmissionColorFactor !== undefined) {
					transmission.setDiffuseTransmissionColorFactor(transmissionDef.diffuseTransmissionColorFactor);
				}

				// Textures.

				if (transmissionDef.diffuseTransmissionTexture !== undefined) {
					const textureInfoDef = transmissionDef.diffuseTransmissionTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source!];
					transmission.setDiffuseTransmissionTexture(texture);
					context.setTextureInfo(transmission.getDiffuseTransmissionTextureInfo()!, textureInfoDef);
				}

				if (transmissionDef.diffuseTransmissionColorTexture !== undefined) {
					const textureInfoDef = transmissionDef.diffuseTransmissionColorTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source!];
					transmission.setDiffuseTransmissionColorTexture(texture);
					context.setTextureInfo(transmission.getDiffuseTransmissionColorTextureInfo()!, textureInfoDef);
				}
			}
		});

		return this;
	}

	/** @hidden */
	public write(context: WriterContext): this {
		const jsonDoc = context.jsonDoc;

		for (const material of this.document.getRoot().listMaterials()) {
			const transmission = material.getExtension<DiffuseTransmission>(NAME);
			if (!transmission) continue;

			const materialIndex = context.materialIndexMap.get(material)!;
			const materialDef = jsonDoc.json.materials![materialIndex];
			materialDef.extensions = materialDef.extensions || {};

			// Factors.

			const transmissionDef = (materialDef.extensions[NAME] = {
				diffuseTransmissionFactor: transmission.getDiffuseTransmissionFactor(),
				diffuseTransmissionColorFactor: transmission.getDiffuseTransmissionColorFactor(),
			} as DiffuseTransmissionDef);

			// Textures.

			if (transmission.getDiffuseTransmissionTexture()) {
				const texture = transmission.getDiffuseTransmissionTexture()!;
				const textureInfo = transmission.getDiffuseTransmissionTextureInfo()!;
				transmissionDef.diffuseTransmissionTexture = context.createTextureInfoDef(texture, textureInfo);
			}

			if (transmission.getDiffuseTransmissionColorTexture()) {
				const texture = transmission.getDiffuseTransmissionColorTexture()!;
				const textureInfo = transmission.getDiffuseTransmissionColorTextureInfo()!;
				transmissionDef.diffuseTransmissionColorTexture = context.createTextureInfoDef(texture, textureInfo);
			}
		}

		return this;
	}
}
