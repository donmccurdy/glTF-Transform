import * as fs from 'fs';
import { BufferUtils, Document, FileUtils, GLTF, ImageUtils, Texture, Transform } from '@gltf-transform/core';
import { MaterialsClearcoat, MaterialsIOR, MaterialsSheen, MaterialsSpecular, MaterialsTransmission, MaterialsVolume } from '@gltf-transform/extensions';

const NAME = 'material';

export interface MaterialOptions {
	pattern?: RegExp;

	// Core.
	baseColor?: string;
	baseColorTexture?: string;
	alpha?: number;
	alphaMode?: GLTF.MaterialAlphaMode;
	alphaCutoff?: number;
	doubleSided?: boolean;
	normalTexture?: string;
	emissive?: string;
	emissiveTexture?: string;
	occlusionTexture?: string;
	roughness?: number;
	metallic?: number;
	roughnessMetallicTexture?: string;

	// Clearcoat.
	clearcoat?: number;
	clearcoatTexture?: string;
	clearcoatRoughness?: number;
	clearcoatRoughnessTexture?: string;
	clearcoatNormalTexture?: string;

	// Transmission.
	transmission?: number;
	transmissionTexture?: string;

	// IOR.
	ior?: number;

	// Specular.
	specular?: number;
	specularColor?: string;
	specularTexture?: string;

	// Sheen.
	sheenColor?: string;
	sheenRoughness?: number;
	sheenColorTexture?: string;
	sheenRoughnessTexture?: string;

	// Volume.
	thickness?: number;
	thicknessTexture?: string;
	attenuationDistance?: number;
	attenuationColor?: string;
}

const material = (options: MaterialOptions): Transform => {

	return (doc: Document): void => {

		const logger = doc.getLogger();
		const textureCache = new Map<string, Texture>();

		for (const key in options) {
			if (key.endsWith('Texture') && !textureCache.has(key)) {
				const path = options[key];
				const basename = FileUtils.basename(path);
				const extension = FileUtils.extension(path);
				const texture = doc.createTexture(basename)
					.setImage(BufferUtils.trim(fs.readFileSync(path)))
					.setURI(`${basename}.${extension}`)
					.setMimeType(ImageUtils.extensionToMimeType(extension));
				textureCache.set(path, texture);
			}
		}

		for (const material of doc.getRoot().listMaterials()) {
			if (options.pattern && !options.pattern.test(material.getName())) continue;

			// Core.
			if (options.baseColor !== undefined) {
				material.setBaseColorHex(parseHexColor(options.baseColor));
			}
			if (options.baseColorTexture !== undefined) {
				material.setBaseColorTexture(textureCache.get(options.baseColorTexture));
			}
			if (options.alpha !== undefined) {
				material.setAlpha(options.alpha);
			}
			if (options.alphaMode !== undefined) {
				material.setAlphaMode(options.alphaMode);
			}
			if (options.alphaCutoff !== undefined) {
				material.setAlphaCutoff(options.alphaCutoff);
			}
			if (options.doubleSided !== undefined) {
				material.setDoubleSided(options.doubleSided);
			}
			if (options.normalTexture !== undefined) {
				material.setNormalTexture(textureCache.get(options.normalTexture));
			}
			if (options.emissive !== undefined) {
				material.setEmissiveHex(parseHexColor(options.emissive));
			}
			if (options.emissiveTexture !== undefined) {
				material.setEmissiveTexture(textureCache.get(options.emissiveTexture));
			}
			if (options.occlusionTexture !== undefined) {
				material.setOcclusionTexture(textureCache.get(options.occlusionTexture));
			}
			if (options.roughness !== undefined) {
				material.setRoughnessFactor(options.roughness);
			}
			if (options.metallic !== undefined) {
				material.setMetallicFactor(options.metallic);
			}
			if (options.roughnessMetallicTexture !== undefined) {
				material.setMetallicRoughnessTexture(
					textureCache.get(options.roughnessMetallicTexture)
				);
			}

			// Clearcoat.
			if (options.clearcoat !== undefined
					|| options.clearcoatTexture !== undefined
					|| options.clearcoatRoughness !== undefined
					|| options.clearcoatRoughnessTexture !== undefined
					|| options.clearcoatNormalTexture !== undefined) {
				const clearcoat = doc.createExtension(MaterialsClearcoat).createClearcoat();
				if (options.clearcoat !== undefined) {
					clearcoat.setClearcoatFactor(options.clearcoat);
				}
				if (options.clearcoatTexture !== undefined) {
					clearcoat.setClearcoatTexture(textureCache.get(options.clearcoatTexture));
				}
				if (options.clearcoatRoughness !== undefined) {
					clearcoat.setClearcoatRoughnessFactor(options.clearcoatRoughness);
				}
				if (options.clearcoatRoughnessTexture !== undefined) {
					clearcoat.setClearcoatRoughnessTexture(
						textureCache.get(options.clearcoatRoughnessTexture)
					);
				}
				if (options.clearcoatNormalTexture !== undefined) {
					clearcoat.setClearcoatNormalTexture(
						textureCache.get(options.clearcoatNormalTexture)
					);
				}
				logger.debug(`${NAME}: Adding extension, "KHR_materials_clearcoat".`);
				material.setExtension('KHR_materials_clearcoat', clearcoat);
			}

			// Transmission.
			if (options.transmission !== undefined || options.transmissionTexture !== undefined) {
				const transmission = doc.createExtension(MaterialsTransmission)
					.createTransmission();
				if (options.transmission !== undefined) {
					transmission.setTransmissionFactor(options.transmission);
				}
				if (options.transmissionTexture !== undefined) {
					transmission
						.setTransmissionTexture(textureCache.get(options.transmissionTexture));
				}
				logger.debug(`${NAME}: Adding extension, "KHR_materials_transmission".`);
				material.setExtension('KHR_materials_transmission', transmission);
			}

			// IOR.
			if (options.ior !== undefined) {
				const ior = doc.createExtension(MaterialsIOR).createIOR().setIOR(options.ior);
				logger.debug(`${NAME}: Adding extension, "KHR_materials_ior".`);
				material.setExtension('KHR_materials_ior', ior);
			}

			// Specular.
			if (options.specular !== undefined
					|| options.specularColor !== undefined
					|| options.specularTexture !== undefined) {
				const specular = doc.createExtension(MaterialsSpecular).createSpecular();
				if (options.specular !== undefined) {
					specular.setSpecularFactor(options.specular);
				}
				if (options.specularColor !== undefined) {
					specular.setSpecularColorHex(parseHexColor(options.specularColor));
				}
				if (options.specularTexture !== undefined) {
					specular.setSpecularTexture(textureCache.get(options.specularTexture));
				}
				logger.debug(`${NAME}: Adding extension, "KHR_materials_specular".`);
				material.setExtension('KHR_materials_specular', specular);
			}

			// Sheen.
			if (options.sheenColor !== undefined
					|| options.sheenRoughness !== undefined
					|| options.sheenColorTexture !== undefined
					|| options.sheenRoughnessTexture !== undefined) {
				const sheen = doc.createExtension(MaterialsSheen).createSheen();
				if (options.sheenColor !== undefined) {
					sheen.setSheenColorHex(parseHexColor(options.sheenColor));
				}
				if (options.sheenRoughness !== undefined) {
					sheen.setSheenRoughnessFactor(options.sheenRoughness);
				}
				if (options.sheenColorTexture !== undefined) {
					sheen.setSheenColorTexture(textureCache.get(options.sheenColorTexture));
				}
				if (options.sheenRoughnessTexture !== undefined) {
					sheen.setSheenRoughnessTexture(textureCache.get(options.sheenRoughnessTexture));
				}
				logger.debug(`${NAME}: Adding extension, "KHR_materials_sheen".`);
				material.setExtension('KHR_materials_sheen', sheen);
			}

			// Volume.
			if (options.thickness !== undefined
					|| options.attenuationDistance !== undefined
					|| options.attenuationColor !== undefined
					|| options.thicknessTexture !== undefined) {
				const volume = doc.createExtension(MaterialsVolume).createVolume();
				if (options.thickness !== undefined) {
					volume.setThicknessFactor(options.thickness);
				}
				if (options.thicknessTexture !== undefined) {
					volume.setThicknessTexture(textureCache.get(options.thicknessTexture));
				}
				if (options.attenuationDistance !== undefined) {
					volume.setAttenuationDistance(options.attenuationDistance);
				}
				if (options.attenuationColor !== undefined) {
					volume.setAttenuationColorHex(parseHexColor(options.attenuationColor));
				}
				logger.debug(`${NAME}: Adding extension, "KHR_materials_volume".`);
				material.setExtension('KHR_materials_volume', volume);
			}
		}

		logger.debug(`${NAME}: Complete.`);
	};

};

function parseHexColor(hex: string): number {
	if (hex.startsWith('#')) hex = hex.slice(1);
	if (hex.startsWith('0x')) hex = hex.slice(2);
	return parseInt(hex, 16);
}

export { material };
