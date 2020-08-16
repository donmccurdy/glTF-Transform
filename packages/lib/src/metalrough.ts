import * as getPixelsNamespace from 'get-pixels';
import * as savePixelsNamespace from 'save-pixels';
import { BufferUtils, Document, Texture, vec2 } from '@gltf-transform/core';
import { IOR, MaterialsIOR, MaterialsPBRSpecularGlossiness, MaterialsSpecular, PBRSpecularGlossiness, Specular } from '@gltf-transform/extensions';

const getPixels = getPixelsNamespace['default'] as Function;
const savePixels = savePixelsNamespace['default'] as Function;

const NAME = 'metalRough';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface MetalRoughOptions {}

interface GetPixelsResult {
	data: Uint8Array;
	shape: vec2;
	set: (i: number, j?: number, k?: number, l?: number) => void;
	get: (i: number, j?: number, k?: number, l?: number) => number;
}

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
				const specGlossTextureInfo = specGloss.getSpecularGlossinessTextureInfo(); // TODO(bug): Confirm shared texture is ok.
				const specGlossTextureSampler = specGloss.getSpecularGlossinessTextureSampler();
				const metalRoughTexture = await rewriteTexture(doc, specGlossTexture, (pixels, i, j) => {
					pixels.set(i, j, 0, 0);
					pixels.set(i, j, 1, 255 - pixels.get(i, j, 3)); // invert glossiness
					pixels.set(i, j, 2, 0);
					pixels.set(i, j, 3, 255);
				});
				const specularTexture = await rewriteTexture(doc, specGlossTexture, (pixels, i, j) => {
					pixels.set(i, j, 3, 255); // remove glossiness
				});

				inputTextures.add(specGlossTexture);
				inputTextures.add(specularTexture);

				// Create specular extension.
				const specular = specExtension.createSpecular()
					.setSpecularFactor(1.0)
					.setSpecularColorFactor(specGloss.getSpecularFactor())
					.setSpecularTexture(specularTexture);
				specular.getSpecularTextureInfo()
					.copy(specGlossTextureInfo);
				specular.getSpecularTextureSampler()
					.copy(specGlossTextureSampler);

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

		// Clean up unused spec/gloss textures.
		// TODO(cleanup): Also remove unused (fallback) metal/rough or baseColor textures?
		Array.from(inputTextures).forEach((tex) => {
			if (tex && tex.listParents().length === 1) tex.dispose();
		});

		logger.debug(`${NAME}: Complete.`);

	};

}

async function rewriteTexture(doc: Document, input: Texture, fn: (pixels: GetPixelsResult, i: number, j: number) => void): Promise<Texture> {
	if (!input) return null;

	const pixels: GetPixelsResult = await new Promise((resolve, reject) => {
		(getPixels as unknown as Function)(
			// TODO(bug): Uint8Array won't work, what's web compat?
			Buffer.from(input.getImage()),
			input.getMimeType(),
			(err, pixels) => err ? reject(err) : resolve(pixels)
		);
	});

	for(let i = 0; i < pixels.shape[0]; ++i) {
		for(let j = 0; j < pixels.shape[1]; ++j) {
			fn(pixels, i, j);
		}
	}

	const image: ArrayBuffer = await new Promise((resolve, reject) => {
		const chunks = [];
		savePixels(pixels, 'png')
			.on('data', (d) => chunks.push(d))
			.on('end', () => resolve(BufferUtils.trim(Buffer.concat(chunks)))) // TODO(bug): Compat?
			.on('error', (e) => reject(e));
	});

	return doc.createTexture('')
		.setMimeType('image/png')
		.setImage(image);
}
