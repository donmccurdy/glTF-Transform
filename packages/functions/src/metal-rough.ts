import type { Document, Texture, Transform } from '@gltf-transform/core';
import {
	KHRMaterialsIOR,
	KHRMaterialsPBRSpecularGlossiness,
	KHRMaterialsSpecular,
	PBRSpecularGlossiness,
} from '@gltf-transform/extensions';
import { createTransform, rewriteTexture } from './utils.js';

const NAME = 'metalRough';

export interface MetalRoughOptions {}

const METALROUGH_DEFAULTS: Required<MetalRoughOptions> = {};

/**
 * Convert {@link Material}s from spec/gloss PBR workflow to metal/rough PBR workflow,
 * removing `KHR_materials_pbrSpecularGlossiness` and adding `KHR_materials_ior` and
 * `KHR_materials_specular`. The metal/rough PBR workflow is preferred for most use cases,
 * and is a prerequisite for other advanced PBR extensions provided by glTF.
 *
 * No options are currently implemented for this function.
 *
 * @category Transforms
 */
export function metalRough(_options: MetalRoughOptions = METALROUGH_DEFAULTS): Transform {
	return createTransform(NAME, async (doc: Document): Promise<void> => {
		const logger = doc.getLogger();

		const extensionsUsed = doc
			.getRoot()
			.listExtensionsUsed()
			.map((ext) => ext.extensionName);
		if (!extensionsUsed.includes('KHR_materials_pbrSpecularGlossiness')) {
			logger.warn(`${NAME}: KHR_materials_pbrSpecularGlossiness not found on document.`);
			return;
		}

		const iorExtension = doc.createExtension(KHRMaterialsIOR);
		const specExtension = doc.createExtension(KHRMaterialsSpecular);
		const specGlossExtension = doc.createExtension(KHRMaterialsPBRSpecularGlossiness);

		const inputTextures = new Set<Texture | null>();

		for (const material of doc.getRoot().listMaterials()) {
			const specGloss = material.getExtension<PBRSpecularGlossiness>('KHR_materials_pbrSpecularGlossiness');
			if (!specGloss) continue;

			// Create specular extension.
			const specular = specExtension
				.createSpecular()
				.setSpecularFactor(1.0)
				.setSpecularColorFactor(specGloss.getSpecularFactor());

			// Stash textures that might become unused, to check and clean up later.
			inputTextures.add(specGloss.getSpecularGlossinessTexture());
			inputTextures.add(material.getBaseColorTexture());
			inputTextures.add(material.getMetallicRoughnessTexture());

			// Set up a metal/rough PBR material with IOR=Infinity (or 0), metallic=0. This
			// representation is precise and reliable, but perhaps less convenient for artists
			// than deriving a metalness value. Unfortunately we can't do that without imprecise
			// heuristics, and perhaps user tuning.
			// See: https://github.com/KhronosGroup/glTF/pull/1719#issuecomment-674365677
			material
				.setBaseColorFactor(specGloss.getDiffuseFactor())
				.setMetallicFactor(0)
				.setRoughnessFactor(1)
				.setExtension('KHR_materials_ior', iorExtension.createIOR().setIOR(1000))
				.setExtension('KHR_materials_specular', specular);

			// Move diffuse -> baseColor.
			const diffuseTexture = specGloss.getDiffuseTexture();
			if (diffuseTexture) {
				material.setBaseColorTexture(diffuseTexture);
				material.getBaseColorTextureInfo()!.copy(specGloss.getDiffuseTextureInfo()!);
			}

			// Move specular + gloss -> specular + roughness.
			const sgTexture = specGloss.getSpecularGlossinessTexture();
			if (sgTexture) {
				// specularGlossiness -> specular.
				const sgTextureInfo = specGloss.getSpecularGlossinessTextureInfo()!;
				const specularTexture = doc.createTexture();
				await rewriteTexture(sgTexture, specularTexture, (pixels, i, j) => {
					pixels.set(i, j, 3, 255); // Remove glossiness.
				});
				specular.setSpecularTexture(specularTexture);
				specular.setSpecularColorTexture(specularTexture);
				specular.getSpecularTextureInfo()!.copy(sgTextureInfo);
				specular.getSpecularColorTextureInfo()!.copy(sgTextureInfo);

				// specularGlossiness -> roughness.
				const glossinessFactor = specGloss.getGlossinessFactor();
				const metalRoughTexture = doc.createTexture();
				await rewriteTexture(sgTexture, metalRoughTexture, (pixels, i, j) => {
					// Invert glossiness.
					const roughness = 255 - Math.round(pixels.get(i, j, 3) * glossinessFactor);
					pixels.set(i, j, 0, 0);
					pixels.set(i, j, 1, roughness);
					pixels.set(i, j, 2, 0);
					pixels.set(i, j, 3, 255);
				});
				material.setMetallicRoughnessTexture(metalRoughTexture);
				material.getMetallicRoughnessTextureInfo()!.copy(sgTextureInfo);
			} else {
				specular.setSpecularColorFactor(specGloss.getSpecularFactor());
				material.setRoughnessFactor(1 - specGloss.getGlossinessFactor());
			}

			// Remove KHR_materials_pbrSpecularGlossiness from the material.
			material.setExtension('KHR_materials_pbrSpecularGlossiness', null);
		}

		// Remove KHR_materials_pbrSpecularGlossiness from the document.
		specGlossExtension.dispose();

		// Clean up unused textures.
		for (const tex of inputTextures) {
			if (tex && tex.listParents().length === 1) tex.dispose();
		}

		logger.debug(`${NAME}: Complete.`);
	});
}
