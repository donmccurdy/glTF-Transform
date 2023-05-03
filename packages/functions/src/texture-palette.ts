import {
	ColorUtils,
	Document,
	Material,
	Primitive,
	PropertyType,
	Texture,
	Transform,
	vec4,
} from '@gltf-transform/core';
import { createTransform } from './utils.js';
import { prune } from './prune.js';
import ndarray, { NdArray, TypedArray } from 'ndarray';
import { dedup } from './dedup.js';
import { savePixels } from 'ndarray-pixels';

const NAME = 'texturePalette';

type TexturableProp = 'baseColor' | 'emissive' | 'roughness' | 'metallic';
const TEXTURABLE_PROPS = ['baseColor', 'emissive', 'roughness', 'metallic'];

/** Properties skipped for material equality comparisons. */
const SKIP_PROPS = new Set([...TEXTURABLE_PROPS, 'name', 'extras']);

export interface TexturePaletteOptions {
	blockSize: number;
	min: number;
}

const TEXTURE_PALETTE_DEFAULTS: Required<TexturePaletteOptions> = {
	blockSize: 1,
	min: 2,
};

/**
 * TODO: Documentation.
 */
export function texturePalette(_options: TexturePaletteOptions = TEXTURE_PALETTE_DEFAULTS): Transform {
	const options = { ...TEXTURE_PALETTE_DEFAULTS, ..._options } as Required<TexturePaletteOptions>;
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

				// 🚩 TODO: material used by eligible and non-eligible primitives (CLONE MATERIAL)
			}
		}

		// (2) Gather list of distinct material properties.

		const materialKeys = new Map<Material, string>();
		const materialProps: Record<TexturableProp, Set<string>> = {
			baseColor: new Set<string>(),
			emissive: new Set<string>(),
			roughness: new Set<string>(),
			metallic: new Set<string>(),
		};

		for (const material of materials) {
			const baseColor = encodeRGBA(material.getBaseColorFactor());
			const emissive = encodeRGBA([...material.getEmissiveFactor(), 1]);
			const roughness = encodeFloat(material.getRoughnessFactor());
			const metallic = encodeFloat(material.getMetallicFactor());
			const key = [baseColor, emissive, roughness, metallic].join(':');
			materialProps.baseColor.add(baseColor);
			materialProps.emissive.add(emissive);
			materialProps.roughness.add(roughness);
			materialProps.metallic.add(metallic);
			materialKeys.set(material, key);
		}

		const keyCount = materialKeys.size;
		if (keyCount < options.min) return;

		// 🚩 TODO: If unique props vs. non-texturable props vs. min threshold fails, bail out.
		// 🚩 TODO: Materials may differ on non-texturable props, which must be preserved.
		// 🚩 TODO: Need to identify unique _combinations_, not just unique values.
		// 🚩 TODO: How should the palette texture be sorted? By RGB components? Hue? Metalness and roughness?
		// 🚩 TODO: Disable mipmaps (nearest).
		// 🚩 TODO: Consider a non-transform version of this, accepting a list of primitives as input.

		const w = ceilPowerOfTwo(keyCount) * blockSize;
		const h = blockSize;

		const paletteTexturePixels: Record<TexturableProp, NdArray<TypedArray> | null> = {
			baseColor: null,
			emissive: null,
			roughness: null,
			metallic: null,
		};

		let baseColorTexture: Texture | null = null;
		let emissiveTexture: Texture | null = null;
		let metallicRoughnessTexture: Texture | null = null;

		if (materialProps.baseColor.size > 1) {
			baseColorTexture = document.createTexture('PaletteBaseColor');
			paletteTexturePixels.baseColor = ndarray(new Float32Array(w * h * 4), [w, h, 4]);
		}
		if (materialProps.emissive.size > 1) {
			emissiveTexture = document.createTexture('PaletteEmissive');
			paletteTexturePixels.emissive = ndarray(new Float32Array(w * h * 4), [w, h, 4]);
		}
		if (materialProps.metallic.size > 1 || materialProps.roughness.size > 1) {
			metallicRoughnessTexture = document.createTexture('PaletteMetallicRoughness');
			const pixels = ndarray(new Float32Array(w * h * 4), [w, h, 4]);
			if (materialProps.metallic.size > 1) paletteTexturePixels.metallic = pixels;
			if (materialProps.roughness.size > 1) paletteTexturePixels.roughness = pixels;
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
				// 🚩 TODO: Refactor to assignBlock function.
				const value = material.getBaseColorFactor();
				const pixels = paletteTexturePixels.baseColor;
				for (let i = 0; i < blockSize; i++) {
					for (let j = 0; j < blockSize; j++) {
						pixels.set(index * blockSize + i, index * blockSize + j, 0, value[0]);
						pixels.set(index * blockSize + i, index * blockSize + j, 1, value[1]);
						pixels.set(index * blockSize + i, index * blockSize + j, 2, value[2]);
						pixels.set(index * blockSize + i, index * blockSize + j, 3, value[3]);
					}
				}
			}

			// 🚩 TODO: Emissive texture.
			// 🚩 TODO: Packed roughness and metallic texture.

			visitedKeys.add(key);
			materialIndices.set(key, index);
		}

		let nextPaletteMaterialIndex = 1;
		for (const prim of prims) {
			const srcMaterial = prim.getMaterial()!;
			const key = materialKeys.get(srcMaterial)!;
			const index = materialIndices.get(key)!;
			// 🚩 TODO: 'material index' is a confusing term here. block index? palette offset?

			const position = prim.getAttribute('POSITION')!;
			const buffer = position.getBuffer();
			const array = new Float32Array(position.getCount() * 2); // 🚩 TODO: f32? uint16? uint8?
			const uv = document.createAccessor().setType('VEC2').setArray(array).setBuffer(buffer);

			prim.setAttribute('TEXCOORD_0', uv);

			let dstMaterial;
			for (const material of paletteMaterials) {
				if (material.equals(srcMaterial, SKIP_PROPS)) {
					dstMaterial = material;
				}
			}
			if (!dstMaterial) {
				// 🚩 TODO: Consider cases where texturable property has 1 unique value,
				// there's no palette texture, and the unique value *isn't* the default below.
				dstMaterial = srcMaterial
					.clone()
					.setName(`PaletteMaterial_${nextPaletteMaterialIndex++}`)
					.setBaseColorFactor([1, 1, 1, 1])
					.setBaseColorTexture(baseColorTexture)
					.setEmissiveFactor(emissiveTexture ? [1, 1, 1] : [0, 0, 0])
					.setEmissiveTexture(emissiveTexture)
					.setMetallicFactor(1)
					.setRoughnessFactor(1)
					.setMetallicRoughnessTexture(metallicRoughnessTexture);
				paletteMaterials.push(dstMaterial);
			}

			//
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
			const pixels = paletteTexturePixels.roughness || paletteTexturePixels.metallic;
			const image = await savePixels(pixels!, mimeType);
			metallicRoughnessTexture.setImage(image).setMimeType(mimeType);
		}

		await document.transform(
			prune({ propertyTypes: [PropertyType.MATERIAL] }),
			dedup({ propertyTypes: [PropertyType.MATERIAL] }) // 🚩 TODO: Not necessary?
		);

		logger.debug(`${NAME}: Complete.`);
	});
}

/** Encodes a floating-point value on the interval [0,1] at 8-bit precision. */
function encodeFloat(value: number): string {
	const hex = Math.round(value * 255).toString(16);
	return hex.length === 1 ? '0' + hex : hex;
}

/** Decodes a floating-point value on the interval [0,1] at 8-bit precision. */
// function decodeFloat(value: string): number {
// 	return Math.floor(parseInt(value, 16) / 255);
// }

/** Encodes an RGBA color in Linear-sRGB-D65 color space. */
function encodeRGBA(value: vec4): string {
	ColorUtils.convertLinearToSRGB(value, value);
	return value.map(encodeFloat).join('');
}

/** Decodes an RGBA color in Linear-sRGB-D65 color space. */
// function decodeRGBA(value: string): vec4 {
// 	const target = [0, 0, 0, 0] as vec4;
// 	for (let i = 0; i < 4; i++) {
// 		target[i] = decodeFloat(value.slice(i * 2, i * 2 + 2));
// 	}
// 	return ColorUtils.convertSRGBToLinear(target, target);
// }

function ceilPowerOfTwo(value: number): number {
	return Math.pow(2, Math.ceil(Math.log(value) / Math.LN2));
}
