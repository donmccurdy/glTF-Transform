import {
	ColorUtils,
	Document,
	Material,
	Primitive,
	PropertyType,
	Texture,
	TextureInfo,
	Transform,
	vec4,
} from '@gltf-transform/core';
import { createTransform } from './utils.js';
import { prune } from './prune.js';
import ndarray, { NdArray, TypedArray } from 'ndarray';
import { savePixels } from 'ndarray-pixels';

const NAME = 'palette';

type TexturableProp = 'baseColor' | 'emissive' | 'metallicRoughness';

export interface PaletteOptions {
	/** Size (in pixels) of a single block within each palette texture. Default: 4. */
	blockSize?: number;
	/**
	 * Minimum number of blocks in the palette texture. If fewer unique
	 * material values are found, no palettes will be generated. Default: 2.
	 */
	min?: number;
}

export const PALETTE_DEFAULTS: Required<PaletteOptions> = {
	blockSize: 4,
	min: 2,
};

/**
 * Creates palette textures containing all unique values of scalar
 * {@link Material} properties within the scene, then merges materials. For
 * scenes with many solid-colored materials (often found in CAD, architectural,
 * or low-poly styles), texture palettes can reduce the number of materials
 * used, and significantly increase the number of {@link Mesh} objects eligible
 * for {@link join} operations.
 *
 * Materials already containing texture coordinates (UVs) are not eligible for
 * texture palette optimizations. Currently only a material's base color,
 * alpha, emissive factor, metallic factor, and roughness factor are converted
 * to palette textures.
 *
 * Example:
 *
 * ```typescript
 * import { palette, flatten, dequantize, join } from '@gltf-transform/functions';
 *
 * await document.transform(
 * 	palette({ min: 5 }),
 * 	flatten(),
 * 	dequantize(),
 * 	join()
 * );
 * ```
 *
 * The illustration below shows a typical base color palette texture:
 *
 * <img
 * 	src="/media/functions/palette.png"
 * 	alt="Row of colored blocks"
 * 	style="width: 100%; max-width: 320px; image-rendering: pixelated;">
 *
 * @category Transforms
 */
export function palette(_options: PaletteOptions = PALETTE_DEFAULTS): Transform {
	const options = { ...PALETTE_DEFAULTS, ..._options } as Required<PaletteOptions>;
	const blockSize = Math.max(options.blockSize, 1);
	const min = Math.max(options.min, 1);

	return createTransform(NAME, async (document: Document): Promise<void> => {
		const logger = document.getLogger();
		const root = document.getRoot();

		// Find and remove unused TEXCOORD_n attributes.
		await document.transform(
			prune({
				propertyTypes: [PropertyType.ACCESSOR],
				keepAttributes: false,
				keepIndices: true,
				keepLeaves: true,
			}),
		);

		const prims = new Set<Primitive>();
		const materials = new Set<Material>();

		// (1) Gather list of eligible prims and materials.

		for (const mesh of root.listMeshes()) {
			for (const prim of mesh.listPrimitives()) {
				const material = prim.getMaterial();
				if (!material || !!prim.getAttribute('TEXCOORD_0')) continue;

				prims.add(prim);
				materials.add(material);
			}
		}

		// (2) Gather list of distinct material properties.

		const materialKeys = new Set<string>();
		const materialKeyMap = new Map<Material, string>();
		const materialProps: Record<TexturableProp, Set<string>> = {
			baseColor: new Set<string>(),
			emissive: new Set<string>(),
			metallicRoughness: new Set<string>(),
		};

		for (const material of materials) {
			const baseColor = encodeRGBA(material.getBaseColorFactor().slice() as vec4);
			const emissive = encodeRGBA([...material.getEmissiveFactor(), 1]);
			const roughness = encodeFloat(material.getRoughnessFactor());
			const metallic = encodeFloat(material.getMetallicFactor());
			const key = `baseColor:${baseColor},emissive:${emissive},metallicRoughness:${metallic}${roughness}`;
			materialProps.baseColor.add(baseColor);
			materialProps.emissive.add(emissive);
			materialProps.metallicRoughness.add(metallic + '+' + roughness);
			materialKeys.add(key);
			materialKeyMap.set(material, key);
		}

		// logger.debug(`${NAME}:\n${Array.from(materialKeys.values()).join('\n')}`);

		const keyCount = materialKeys.size;
		if (keyCount < min) {
			logger.debug(`${NAME}: Found <${min} unique material properties. Exiting.`);
			return;
		}

		// (3) Allocate palette textures.

		const w = ceilPowerOfTwo(keyCount * blockSize);
		const h = ceilPowerOfTwo(blockSize);
		const padWidth = w - keyCount * blockSize;

		const paletteTexturePixels: Record<TexturableProp, NdArray<Uint8Array> | null> = {
			baseColor: null,
			emissive: null,
			metallicRoughness: null,
		};

		// Properties skipped for material equality comparisons.
		const skipProps = new Set(['name', 'extras']);
		const skip = (...props: string[]) => props.forEach((prop) => skipProps.add(prop));

		let baseColorTexture: Texture | null = null;
		let emissiveTexture: Texture | null = null;
		let metallicRoughnessTexture: Texture | null = null;

		if (materialProps.baseColor.size >= min) {
			const name = 'PaletteBaseColor';
			baseColorTexture = document.createTexture(name).setURI(`${name}.png`);
			paletteTexturePixels.baseColor = ndarray(new Uint8Array(w * h * 4), [w, h, 4]);
			skip('baseColorFactor', 'baseColorTexture', 'baseColorTextureInfo');
		}
		if (materialProps.emissive.size >= min) {
			const name = 'PaletteEmissive';
			emissiveTexture = document.createTexture(name).setURI(`${name}.png`);
			paletteTexturePixels.emissive = ndarray(new Uint8Array(w * h * 4), [w, h, 4]);
			skip('emissiveFactor', 'emissiveTexture', 'emissiveTextureInfo');
		}
		if (materialProps.metallicRoughness.size >= min) {
			const name = 'PaletteMetallicRoughness';
			metallicRoughnessTexture = document.createTexture(name).setURI(`${name}.png`);
			paletteTexturePixels.metallicRoughness = ndarray(new Uint8Array(w * h * 4), [w, h, 4]);
			skip('metallicFactor', 'roughnessFactor', 'metallicRoughnessTexture', 'metallicRoughnessTextureInfo');
		}

		if (!(baseColorTexture || emissiveTexture || metallicRoughnessTexture)) {
			logger.debug(`${NAME}: No material property has >=${min} unique values. Exiting.`);
			return;
		}

		// (4) Write blocks to palette textures.

		const visitedKeys = new Set<string>();
		const materialIndices = new Map<string, number>();
		const paletteMaterials: Material[] = [];

		let nextIndex = 0;
		for (const material of materials) {
			const key = materialKeyMap.get(material)!;
			if (visitedKeys.has(key)) continue;

			const index = nextIndex++;

			if (paletteTexturePixels.baseColor) {
				const pixels = paletteTexturePixels.baseColor;
				const baseColor = [...material.getBaseColorFactor()] as vec4;
				ColorUtils.convertLinearToSRGB(baseColor, baseColor);
				writeBlock(pixels, index, baseColor, blockSize);
			}
			if (paletteTexturePixels.emissive) {
				const pixels = paletteTexturePixels.emissive;
				const emissive = [...material.getEmissiveFactor(), 1] as vec4;
				ColorUtils.convertLinearToSRGB(emissive, emissive);
				writeBlock(pixels, index, emissive, blockSize);
			}
			if (paletteTexturePixels.metallicRoughness) {
				const pixels = paletteTexturePixels.metallicRoughness;
				const metallic = material.getMetallicFactor();
				const roughness = material.getRoughnessFactor();
				writeBlock(pixels, index, [0, roughness, metallic, 1], blockSize);
			}

			visitedKeys.add(key);
			materialIndices.set(key, index);
		}

		// (5) Compress palette textures and assign to palette materials.

		const mimeType = 'image/png';

		if (baseColorTexture) {
			const image = await savePixels(paletteTexturePixels.baseColor!, mimeType);
			baseColorTexture.setImage(image).setMimeType(mimeType);
		}
		if (emissiveTexture) {
			const image = await savePixels(paletteTexturePixels.emissive!, mimeType);
			emissiveTexture.setImage(image).setMimeType(mimeType);
		}
		if (metallicRoughnessTexture) {
			const image = await savePixels(paletteTexturePixels.metallicRoughness!, mimeType);
			metallicRoughnessTexture.setImage(image).setMimeType(mimeType);
		}

		// (6) Create palette materials, generate UVs, and assign both to prims.

		let nextPaletteMaterialIndex = 1;
		for (const prim of prims) {
			const srcMaterial = prim.getMaterial()!;
			const key = materialKeyMap.get(srcMaterial)!;
			const blockIndex = materialIndices.get(key)!;

			// UVs are centered horizontally in each block, descending vertically
			// to form a diagonal line in the UV layout. Easy and compressible.
			const baseUV = (blockIndex + 0.5) / keyCount;
			const padUV = (baseUV * (w - padWidth)) / w;

			const position = prim.getAttribute('POSITION')!;
			const buffer = position.getBuffer();
			const array = new Float32Array(position.getCount() * 2).fill(padUV);
			const uv = document.createAccessor().setType('VEC2').setArray(array).setBuffer(buffer);

			let dstMaterial;
			for (const material of paletteMaterials) {
				if (material.equals(srcMaterial, skipProps)) {
					dstMaterial = material;
				}
			}

			if (!dstMaterial) {
				const suffix = (nextPaletteMaterialIndex++).toString().padStart(3, '0');
				dstMaterial = srcMaterial.clone().setName(`PaletteMaterial${suffix}`);

				if (baseColorTexture) {
					dstMaterial
						.setBaseColorFactor([1, 1, 1, 1])
						.setBaseColorTexture(baseColorTexture)
						.getBaseColorTextureInfo()!
						.setMinFilter(TextureInfo.MinFilter.NEAREST)
						.setMagFilter(TextureInfo.MagFilter.NEAREST);
				}
				if (emissiveTexture) {
					dstMaterial
						.setEmissiveFactor([1, 1, 1])
						.setEmissiveTexture(emissiveTexture)
						.getEmissiveTextureInfo()!
						.setMinFilter(TextureInfo.MinFilter.NEAREST)
						.setMagFilter(TextureInfo.MagFilter.NEAREST);
				}
				if (metallicRoughnessTexture) {
					dstMaterial
						.setMetallicFactor(1)
						.setRoughnessFactor(1)
						.setMetallicRoughnessTexture(metallicRoughnessTexture)
						.getMetallicRoughnessTextureInfo()!
						.setMinFilter(TextureInfo.MinFilter.NEAREST)
						.setMagFilter(TextureInfo.MagFilter.NEAREST);
				}

				paletteMaterials.push(dstMaterial);
			}

			prim.setMaterial(dstMaterial).setAttribute('TEXCOORD_0', uv);
		}

		await document.transform(prune({ propertyTypes: [PropertyType.MATERIAL] }));

		logger.debug(`${NAME}: Complete.`);
	});
}

/** Encodes a floating-point value on the interval [0,1] at 8-bit precision. */
function encodeFloat(value: number): string {
	const hex = Math.round(value * 255).toString(16);
	return hex.length === 1 ? '0' + hex : hex;
}

/** Encodes an RGBA color in Linear-sRGB-D65 color space. */
function encodeRGBA(value: vec4): string {
	ColorUtils.convertLinearToSRGB(value, value);
	return value.map(encodeFloat).join('');
}

/** Returns the nearest higher power of two. */
function ceilPowerOfTwo(value: number): number {
	return Math.pow(2, Math.ceil(Math.log(value) / Math.LN2));
}

/** Writes an NxN block of pixels to an image, at the given block index. */
function writeBlock(pixels: NdArray<TypedArray>, index: number, value: vec4, blockSize: number): void {
	for (let i = 0; i < blockSize; i++) {
		for (let j = 0; j < blockSize; j++) {
			pixels.set(index * blockSize + i, j, 0, value[0] * 255);
			pixels.set(index * blockSize + i, j, 1, value[1] * 255);
			pixels.set(index * blockSize + i, j, 2, value[2] * 255);
			pixels.set(index * blockSize + i, j, 3, value[3] * 255);
		}
	}
}
