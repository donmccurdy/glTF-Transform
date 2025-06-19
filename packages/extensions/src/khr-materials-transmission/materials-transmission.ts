import { Extension, type GLTF, PropertyType, type ReaderContext, type WriterContext } from '@gltf-transform/core';
import { KHR_MATERIALS_TRANSMISSION } from '../constants.js';
import { Transmission } from './transmission.js';

interface TransmissionDef {
	transmissionFactor?: number;
	transmissionTexture?: GLTF.ITextureInfo;
}

/**
 * [`KHR_materials_transmission`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_transmission/)
 * provides a common type of optical transparency: infinitely-thin materials with no refraction,
 * scattering, or dispersion.
 *
 * ![Illustration](/media/extensions/khr-materials-transmission.png)
 *
 * > _**Figure:** Sphere using `KHR_materials_transmission` with varying roughness (0.0, 0.2, 0.4).
 * > Source: Khronos Group._
 *
 * While default PBR materials using alpha blending become invisible as their opacity approaches
 * zero, a transmissive material continues to reflect light in a glass-like manner, even at low
 * transmission values. When combined with {@link KHRMaterialsVolume}, transmission may be used for
 * thicker materials and refractive effects.
 *
 * Properties:
 * - {@link Transmission}
 *
 * ### Example
 *
 * The `KHRMaterialsTransmission` class provides a single {@link ExtensionProperty} type,
 * `Transmission`, which may be attached to any {@link Material} instance. For example:
 *
 * ```typescript
 * import { KHRMaterialsTransmission, Transmission } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const transmissionExtension = document.createExtension(KHRMaterialsTransmission);
 *
 * // Create a Transmission property.
 * const transmission = transmissionExtension.createTransmission()
 * 	.setTransmissionFactor(1.0);
 *
 * // Attach the property to a Material.
 * material.setExtension('KHR_materials_transmission', transmission);
 * ```
 */
export class KHRMaterialsTransmission extends Extension {
	public static readonly EXTENSION_NAME: typeof KHR_MATERIALS_TRANSMISSION = KHR_MATERIALS_TRANSMISSION;
	public readonly extensionName: typeof KHR_MATERIALS_TRANSMISSION = KHR_MATERIALS_TRANSMISSION;
	public readonly prereadTypes: PropertyType[] = [PropertyType.MESH];
	public readonly prewriteTypes: PropertyType[] = [PropertyType.MESH];

	/** Creates a new Transmission property for use on a {@link Material}. */
	public createTransmission(): Transmission {
		return new Transmission(this.document.getGraph());
	}

	/** @hidden */
	public read(_context: ReaderContext): this {
		return this;
	}

	/** @hidden */
	public write(_context: WriterContext): this {
		return this;
	}

	/** @hidden */
	public preread(context: ReaderContext): this {
		const jsonDoc = context.jsonDoc;
		const materialDefs = jsonDoc.json.materials || [];
		const textureDefs = jsonDoc.json.textures || [];
		materialDefs.forEach((materialDef, materialIndex) => {
			if (materialDef.extensions && materialDef.extensions[KHR_MATERIALS_TRANSMISSION]) {
				const transmission = this.createTransmission();
				context.materials[materialIndex].setExtension(KHR_MATERIALS_TRANSMISSION, transmission);

				const transmissionDef = materialDef.extensions[KHR_MATERIALS_TRANSMISSION] as TransmissionDef;

				// Factors.

				if (transmissionDef.transmissionFactor !== undefined) {
					transmission.setTransmissionFactor(transmissionDef.transmissionFactor);
				}

				// Textures.

				if (transmissionDef.transmissionTexture !== undefined) {
					const textureInfoDef = transmissionDef.transmissionTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source!];
					transmission.setTransmissionTexture(texture);
					context.setTextureInfo(transmission.getTransmissionTextureInfo()!, textureInfoDef);
				}
			}
		});

		return this;
	}

	/** @hidden */
	public prewrite(context: WriterContext): this {
		const jsonDoc = context.jsonDoc;

		this.document
			.getRoot()
			.listMaterials()
			.forEach((material) => {
				const transmission = material.getExtension<Transmission>(KHR_MATERIALS_TRANSMISSION);
				if (transmission) {
					const materialIndex = context.materialIndexMap.get(material)!;
					const materialDef = jsonDoc.json.materials![materialIndex];
					materialDef.extensions = materialDef.extensions || {};

					// Factors.

					const transmissionDef = (materialDef.extensions[KHR_MATERIALS_TRANSMISSION] = {
						transmissionFactor: transmission.getTransmissionFactor(),
					} as TransmissionDef);

					// Textures.

					if (transmission.getTransmissionTexture()) {
						const texture = transmission.getTransmissionTexture()!;
						const textureInfo = transmission.getTransmissionTextureInfo()!;
						transmissionDef.transmissionTexture = context.createTextureInfoDef(texture, textureInfo);
					}
				}
			});

		return this;
	}
}
