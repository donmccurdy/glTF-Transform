import { Document, Texture } from '@gltf-transform/core';
import { IOR, MaterialsIOR, MaterialsPBRSpecularGlossiness, MaterialsSpecular, PBRSpecularGlossiness, Specular } from '@gltf-transform/extensions';
import { rewriteTexture } from './utils';

const NAME = 'metalRough';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface MetalRoughOptions {}

/**
 * Converts a spec/gloss PBR workflow to a metal/rough PBR workflow, relying on the IOR and
 * specular extensions to base glTF 2.0.
 */
export function metalRough (options: MetalRoughOptions = {}) {

	return async (doc: Document): Promise<void> => {

		const logger = doc.getLogger();

		const extensionName = MaterialsPBRSpecularGlossiness.EXTENSION_NAME;
		const extensionsUsed = doc.getRoot().listExtensionsUsed().map((ext) => ext.extensionName);
		if (!extensionsUsed.includes(extensionName)) {
			logger.warn(`${NAME}: Extension ${extensionName} not found on given document.`);
			return;
		}

		const iorExtension = doc.createExtension(MaterialsIOR) as MaterialsIOR;
		const specExtension = doc.createExtension(MaterialsSpecular) as MaterialsSpecular;
		const specGlossExtension = doc.createExtension(MaterialsPBRSpecularGlossiness) as MaterialsPBRSpecularGlossiness;

		const inputTextures = new Set<Texture>();

		for (const material of doc.getRoot().listMaterials()) {
			const specGloss = material.getExtension(PBRSpecularGlossiness) as PBRSpecularGlossiness;
			if (!specGloss) continue;

			// Create specular extension.
			const specular = specExtension.createSpecular()
				.setSpecularFactor(1.0)
				.setSpecularColorFactor(specGloss.getSpecularFactor());

			// Set up a metal/rough PBR material with IOR=0 (or Infinity), metallic=0. This
			// representation is precise and reliable, but perhaps less convenient for artists
			// than deriving a metalness value. Unfortunately we can't do that without imprecise
			// heuristics, and perhaps user tuning.
			// See: https://github.com/KhronosGroup/glTF/pull/1719#issuecomment-674365677
			material
				.setBaseColorFactor(specGloss.getDiffuseFactor())
				.setBaseColorTexture(specGloss.getDiffuseTexture())
				.setMetallicFactor(0)
				.setRoughnessFactor(1)
				.setExtension(IOR, iorExtension.createIOR().setIOR(0))
				.setExtension(Specular, specular);

			// Convent specGloss texture to specular + roughness.
			const sgTexture = specGloss.getSpecularGlossinessTexture();
			if (sgTexture) {
				// specularGlossiness -> specular.
				const sgTextureInfo = specGloss.getSpecularGlossinessTextureInfo();
				const sgTextureSampler = specGloss.getSpecularGlossinessTextureSampler();
				const specularTexture = await rewriteTexture(doc, sgTexture, (pixels, i, j) => {
					pixels.set(i, j, 3, 255); // Remove glossiness.
				});
				specular.setSpecularTexture(specularTexture);
				specular.getSpecularTextureInfo().copy(sgTextureInfo);
				specular.getSpecularTextureSampler().copy(sgTextureSampler);

				// specularGlossiness -> roughness.
				const glossinessFactor = specGloss.getGlossinessFactor();
				const metalRoughTexture = await rewriteTexture(doc, sgTexture, (pixels, i, j) => {
					// Invert glossiness.
					const roughness = 255 - Math.round(pixels.get(i, j, 3) * glossinessFactor);
					pixels.set(i, j, 0, 0);
					pixels.set(i, j, 1, roughness);
					pixels.set(i, j, 2, 0);
					pixels.set(i, j, 3, 255);
				});
				material.setMetallicRoughnessTexture(metalRoughTexture);
				material.getMetallicRoughnessTextureInfo().copy(sgTextureInfo);
				material.getMetallicRoughnessTextureSampler().copy(sgTextureSampler);
			} else {
				specular.setSpecularColorFactor(specGloss.getSpecularFactor());
				material.setRoughnessFactor(1 - specGloss.getGlossinessFactor());
			}

			// Stash textures that might be unused, to check and clean up later.
			inputTextures.add(sgTexture);
			inputTextures.add(material.getBaseColorTexture());
			inputTextures.add(material.getMetallicRoughnessTexture());

			// Remove KHR_materials_pbrSpecularGlossiness from the material.
			material.setExtension(PBRSpecularGlossiness, null);
		}

		// Remove KHR_materials_pbrSpecularGlossiness from the document.
		specGlossExtension.dispose();

		// Clean up unused textures.
		for (const tex of inputTextures) {
			if (tex && tex.listParents().length === 1) tex.dispose();
		}

		logger.debug(`${NAME}: Complete.`);

	};

}
