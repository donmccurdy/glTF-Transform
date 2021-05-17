import { Extension, GLTF, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_MATERIALS_TRANSMISSION } from '../constants';
import { Transmission } from './transmission';

const NAME = KHR_MATERIALS_TRANSMISSION;

interface TransmissionDef {
	transmissionFactor?: number;
	transmissionTexture?: GLTF.ITextureInfo;
}

/**
 * # MaterialsTransmission
 *
 * [`KHR_materials_transmission`](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_materials_transmission/)
 * provides a common type of optical transparency: infinitely-thin materials with no refraction,
 * scattering, or dispersion.
 *
 * While default PBR materials using alpha blending become invisible as their opacity approaches
 * zero, a transmissive material continues to reflect light in a glass-like manner, even at low
 * transmission values. When combined with {@link MaterialsVolume}, transmission may be used for
 * thicker materials and refractive effects.
 *
 * Properties:
 * - {@link Transmission}
 *
 * ### Example
 *
 * The `MaterialsTransmission` class provides a single {@link ExtensionProperty} type,
 * `Transmission`, which may be attached to any {@link Material} instance. For example:
 *
 * ```typescript
 * import { MaterialsTransmission, Transmission } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const transmissionExtension = document.createExtension(MaterialsTransmission);
 *
 * // Create a Transmission property.
 * const transmission = transmissionExtension.createTransmission()
 * 	.setTransmissionFactor(1.0);
 *
 * // Attach the property to a Material.
 * material.setExtension('KHR_materials_transmission', transmission);
 * ```
 */
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
					const texture = context.textures[textureDefs[textureInfoDef.index].source!];
					transmission.setTransmissionTexture(texture);
					context.setTextureInfo(
						transmission.getTransmissionTextureInfo()!,
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
					const materialIndex = context.materialIndexMap.get(material)!;
					const materialDef = jsonDoc.json.materials![materialIndex];
					materialDef.extensions = materialDef.extensions || {};

					// Factors.

					const transmissionDef = materialDef.extensions[NAME] = {
						transmissionFactor: transmission.getTransmissionFactor(),
					} as TransmissionDef;

					// Textures.

					if (transmission.getTransmissionTexture()) {
						const texture = transmission.getTransmissionTexture()!;
						const textureInfo = transmission.getTransmissionTextureInfo()!;
						transmissionDef.transmissionTexture
							= context.createTextureInfoDef(texture, textureInfo);
					}
				}
			});

		return this;
	}
}
