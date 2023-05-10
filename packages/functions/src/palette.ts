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
import { scale as scaleVEC4 } from 'gl-matrix/vec4';
import { scale as scaleVEC3 } from 'gl-matrix/vec3';

const NAME = 'palette';

type TexturableProp = 'baseColor' | 'emissive' | 'metallicRoughness';

/** Properties skipped for material equality comparisons. */
const SKIP_PROPS = new Set([
	'name',
	'extras',
	'baseColorTexture',
	'baseColorTextureInfo',
	'emissiveTexture',
	'emissiveTextureInfo',
	'metallicRoughnessTexture',
	'metallicRoughnessTextureInfo',
]);

export interface PaletteOptions {
	blockSize?: number;
	min?: number;
}

export const PALETTE_DEFAULTS: Required<PaletteOptions> = {
	blockSize: 4,
	min: 2,
};

/**
 * TODO: Documentation.
 *
 * @category Transforms
 */
export function palette(_options: PaletteOptions = PALETTE_DEFAULTS): Transform {
	const options = { ...PALETTE_DEFAULTS, ..._options } as Required<PaletteOptions>;
	const blockSize = Math.max(options.blockSize, 1);

	return createTransform(NAME, async (document: Document): Promise<void> => {
		const logger = document.getLogger();
		const root = document.getRoot();

		// Find and remove unused TEXCOORD_n attributes.
		await document.transform(
			prune({
				keepAttributes: false,
				keepLeaves: true,
				propertyTypes: [PropertyType.ACCESSOR],
			})
		);

		const prims = new Set<Primitive>();
		const materials = new Set<Material>();

		// (1) Gather list of eligible primitives and materials.

		for (const mesh of root.listMeshes()) {
			for (const prim of mesh.listPrimitives()) {
				const material = prim.getMaterial();
				if (!material || !!prim.getAttribute('TEXCOORD_0')) continue;

				prims.add(prim);
				materials.add(material);

				// TODO: material used by eligible and non-eligible primitives (CLONE MATERIAL)
			}
		}

		// (2) Gather list of distinct material properties.

		const materialKeys = new Map<Material, string>();
		const materialProps: Record<TexturableProp, Set<string>> = {
			baseColor: new Set<string>(),
			emissive: new Set<string>(),
			metallicRoughness: new Set<string>(),
		};

		for (const material of materials) {
			const baseColor = encodeRGBA(material.getBaseColorFactor());
			const emissive = encodeRGBA([...material.getEmissiveFactor(), 1]);
			const roughness = encodeFloat(material.getRoughnessFactor());
			const metallic = encodeFloat(material.getMetallicFactor());
			const key = `baseColor:${baseColor},emissive:${emissive},metallicRoughness:${metallic}+${roughness}`;
			materialProps.baseColor.add(baseColor);
			materialProps.emissive.add(emissive);
			materialProps.metallicRoughness.add(metallic + '+' + roughness);
			materialKeys.set(material, key);
		}

		const keyCount = materialKeys.size;
		if (keyCount < options.min) return;

		// TODO: Debugging only.
		logger.warn(`${NAME}:\n${Array.from(materialKeys.values()).join('\n')}`);

		// TODO: If we have more than the >min keys, but <min materials can actually share them, bail.
		// TODO: If scene has 100 opaque and 1 transparent materials, does the latter get included in a palette?
		// TODO: How should the palette texture be sorted? By RGB components? Hue? Metalness and roughness?
		// TODO: Consider a non-transform version of this, accepting a list of primitives as input.
		// TODO: Consider emissive >1.

		const w = ceilPowerOfTwo(keyCount) * blockSize;
		const h = blockSize;
		const padWidth = w - keyCount * blockSize;

		const paletteTexturePixels: Record<TexturableProp, NdArray<TypedArray> | null> = {
			baseColor: null,
			emissive: null,
			metallicRoughness: null,
		};

		let baseColorTexture: Texture | null = null;
		let emissiveTexture: Texture | null = null;
		let metallicRoughnessTexture: Texture | null = null;

		if (materialProps.baseColor.size > 1) {
			const name = 'PaletteBaseColor';
			baseColorTexture = document.createTexture(name).setURI(`${name}.png`);
			paletteTexturePixels.baseColor = ndarray(new Uint8Array(w * h * 4), [w, h, 4]);
		}
		if (materialProps.emissive.size > 1) {
			const name = 'PaletteEmissive';
			emissiveTexture = document.createTexture(name).setURI(`${name}.png`);
			paletteTexturePixels.emissive = ndarray(new Uint8Array(w * h * 4), [w, h, 4]);
		}
		if (materialProps.metallicRoughness.size > 1) {
			const name = 'PaletteMetallicRoughness';
			metallicRoughnessTexture = document.createTexture(name).setURI(`${name}.png`);
			paletteTexturePixels.metallicRoughness = ndarray(new Uint8Array(w * h * 4), [w, h, 4]);
		}

		// Create palette textures.

		const visitedKeys = new Set<string>();
		const materialIndices = new Map<string, number>();
		const paletteMaterials: Material[] = [];

		let nextIndex = 0;
		for (const material of materials) {
			const key = materialKeys.get(material)!;
			if (visitedKeys.has(key)) continue;

			const index = nextIndex++;

			if (paletteTexturePixels.baseColor) {
				const pixels = paletteTexturePixels.baseColor;
				const baseColor = material.getBaseColorFactor();
				// ColorUtils.convertLinearToSRGB(baseColor, baseColor); // 🚩 TODO: Why not required?
				scaleVEC4(baseColor, baseColor, 255);
				writeBlock(pixels, index, baseColor, blockSize);
			}

			if (paletteTexturePixels.emissive) {
				const pixels = paletteTexturePixels.emissive;
				const emissive = material.getEmissiveFactor();
				// ColorUtils.convertLinearToSRGB(emissive, emissive);
				scaleVEC3(emissive, emissive, 255);
				writeBlock(pixels, index, [...emissive, 255], blockSize);
			}

			if (paletteTexturePixels.metallicRoughness) {
				const pixels = paletteTexturePixels.metallicRoughness;
				const metallic = material.getMetallicFactor();
				const roughness = material.getRoughnessFactor();
				writeBlock(pixels, index, [0, roughness * 255, metallic * 255, 255], blockSize);
			}

			visitedKeys.add(key);
			materialIndices.set(key, index);
		}

		let nextPaletteMaterialIndex = 1;
		for (const prim of prims) {
			const srcMaterial = prim.getMaterial()!;
			const key = materialKeys.get(srcMaterial)!;
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
				if (material.equals(srcMaterial, SKIP_PROPS)) {
					dstMaterial = material;
				}
			}

			if (!dstMaterial) {
				// TODO: Consider cases where texturable property has 1 unique value, there's
				// no palette texture, and the unique value *isn't* the default below.
				// TODO: This index skips from 1 to 3 in output materials?
				dstMaterial = srcMaterial.clone().setName(`PaletteMaterial_${nextPaletteMaterialIndex++}`);

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

function ceilPowerOfTwo(value: number): number {
	return Math.pow(2, Math.ceil(Math.log(value) / Math.LN2));
}

function writeBlock(pixels: NdArray<TypedArray>, index: number, value: vec4, blockSize: number): void {
	for (let i = 0; i < blockSize; i++) {
		for (let j = 0; j < blockSize; j++) {
			pixels.set(index * blockSize + i, j, 0, value[0]);
			pixels.set(index * blockSize + i, j, 1, value[1]);
			pixels.set(index * blockSize + i, j, 2, value[2]);
			pixels.set(index * blockSize + i, j, 3, value[3]);
		}
	}
}
