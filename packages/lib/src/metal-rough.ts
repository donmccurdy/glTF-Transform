import { Document, Texture } from '@gltf-transform/core';
import { IOR, MaterialsIOR, MaterialsPBRSpecularGlossiness, MaterialsSpecular, PBRSpecularGlossiness, Specular } from '@gltf-transform/extensions';
import { rewriteTexture } from './utils';

const NAME = 'metalRough';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface MetalRoughOptions {}

export function metalRough (options: MetalRoughOptions = {}) {

	return async (doc: Document): Promise<void> => {

		const logger = doc.getLogger();

		const extensionsUsed = doc.getRoot().listExtensionsUsed().map((ext) => ext.extensionName);
		if (!extensionsUsed.includes(MaterialsPBRSpecularGlossiness.EXTENSION_NAME)) {
			logger.warn(`${NAME}: Extension ${MaterialsPBRSpecularGlossiness.EXTENSION_NAME} not found on given document.`);
			return;
		}

		const iorExtension = doc.createExtension(MaterialsIOR) as MaterialsIOR;
		const specExtension = doc.createExtension(MaterialsSpecular) as MaterialsSpecular;
		const specGlossExtension = doc.createExtension(MaterialsPBRSpecularGlossiness) as MaterialsPBRSpecularGlossiness;

		const inputTextures = new Set<Texture>();

		for (const material of doc.getRoot().listMaterials()) {
			const specGloss = material.getExtension(PBRSpecularGlossiness) as PBRSpecularGlossiness;
			if (specGloss) {
				// Convent gloss -> roughness texture.
				const specGlossTexture = specGloss.getSpecularGlossinessTexture();
				const specGlossTextureInfo = specGloss.getSpecularGlossinessTextureInfo();
				const specGlossTextureSampler = specGloss.getSpecularGlossinessTextureSampler(); // TODO(bug): Succeed if no texture.
				const metalRoughTexture = await rewriteTexture(doc, specGlossTexture, (pixels, i, j) => {
					pixels.set(i, j, 0, 0);
					pixels.set(i, j, 1, 255 - pixels.get(i, j, 3)); // invert glossiness
					pixels.set(i, j, 2, 0);
					pixels.set(i, j, 3, 255);
				});
				const specularTexture = await rewriteTexture(doc, specGlossTexture, (pixels, i, j) => {
					pixels.set(i, j, 3, 255); // remove glossiness
				});

				// Create specular extension.
				const specular = specExtension.createSpecular()
					.setSpecularFactor(1.0)
					.setSpecularColorFactor(specGloss.getSpecularFactor())
					.setSpecularTexture(specularTexture);
				specular.getSpecularTextureInfo()
					.copy(specGlossTextureInfo);
				specular.getSpecularTextureSampler()
					.copy(specGlossTextureSampler);

				// Stash original textures, to clean up later.
				inputTextures.add(specGlossTexture);
				inputTextures.add(specularTexture);
				inputTextures.add(material.getBaseColorTexture());
				inputTextures.add(material.getMetallicRoughnessTexture());

				// Rewrite material.
				material
					.setBaseColorFactor(specGloss.getDiffuseFactor())
					.setBaseColorTexture(specGloss.getDiffuseTexture())
					.setMetallicFactor(0)
					.setRoughnessFactor(specGloss.getGlossinessFactor()) // TODO(bug): Bake?
					.setMetallicRoughnessTexture(metalRoughTexture)
					.setExtension(IOR, iorExtension.createIOR().setIOR(0))
					.setExtension(Specular, specular)
					.setExtension(PBRSpecularGlossiness, null);
				material.getMetallicRoughnessTextureInfo()
					.copy(specGlossTextureInfo);
				material.getMetallicRoughnessTextureSampler()
					.copy(specGlossTextureSampler);
			}
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
