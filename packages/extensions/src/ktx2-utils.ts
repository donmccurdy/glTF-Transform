import type { ImageUtilsFormat, vec2 } from '@gltf-transform/core';
import {
	KHR_DF_MODEL_ETC1S,
	KHR_DF_MODEL_UASTC,
	KHR_SUPERCOMPRESSION_NONE,
	type KTX2Container,
	read as readKTX,
	VK_FORMAT_ASTC_4x4_SFLOAT_BLOCK_EXT,
	VK_FORMAT_E5B9G9R9_UFLOAT_PACK32,
	VK_FORMAT_UNDEFINED,
} from 'ktx-parse';

export function isUncompressed(container: KTX2Container): boolean {
	return container.vkFormat > VK_FORMAT_UNDEFINED && container.vkFormat <= VK_FORMAT_E5B9G9R9_UFLOAT_PACK32;
}

export function isUniversal(container: KTX2Container): boolean {
	// Basis UASTC HDR is a subset of ASTC, which can be transcoded efficiently
	// to BC6H. To detect whether a KTX2 file uses Basis UASTC HDR, or default
	// ASTC, inspect the DFD color model.
	//
	// Source: https://github.com/BinomialLLC/basis_universal/issues/381
	const isBasisHDR =
		container.vkFormat === VK_FORMAT_ASTC_4x4_SFLOAT_BLOCK_EXT &&
		container.dataFormatDescriptor[0].colorModel === 0xa7;
	return container.vkFormat === VK_FORMAT_UNDEFINED || isBasisHDR;
}

/** Parses a KTX2 container, returning null if the image is missing or cannot be parsed. */
export function readKTXOrNull(image: Uint8Array | null): KTX2Container | null {
	if (!image) return null;
	try {
		return readKTX(image);
	} catch {
		return null;
	}
}

export class KTX2ImageUtils implements ImageUtilsFormat {
	match(array: Uint8Array): boolean {
		return (
			array[0] === 0xab &&
			array[1] === 0x4b &&
			array[2] === 0x54 &&
			array[3] === 0x58 &&
			array[4] === 0x20 &&
			array[5] === 0x32 &&
			array[6] === 0x30 &&
			array[7] === 0xbb &&
			array[8] === 0x0d &&
			array[9] === 0x0a &&
			array[10] === 0x1a &&
			array[11] === 0x0a
		);
	}
	getSize(array: Uint8Array): vec2 {
		const container = readKTX(array);
		return [container.pixelWidth, container.pixelHeight];
	}
	getChannels(array: Uint8Array): number {
		const container = readKTX(array);
		const dfd = container.dataFormatDescriptor[0];

		if (isUncompressed(container)) {
			return dfd.samples.length;
		}

		if (isUniversal(container)) {
			switch (dfd.colorModel) {
				case KHR_DF_MODEL_ETC1S:
					return dfd.samples.length === 2 && (dfd.samples[1].channelType & 0xf) === 15 ? 4 : 3;
				case KHR_DF_MODEL_UASTC:
					return (dfd.samples[0].channelType & 0xf) === 3 ? 4 : 3;
				default:
					throw new Error(`Unexpected KTX2 colorModel, "${dfd.colorModel}".`);
			}
		}

		// Support for getChannels() on GPU texture formats not yet implemented.
		throw new Error(`Unexpected KTX2 vkFormat, "${container.vkFormat}".`);
	}
	getVRAMByteLength(array: Uint8Array): number {
		const container = readKTX(array);

		let uncompressedBytes = 0;

		if (isUniversal(container)) {
			const hasAlpha = this.getChannels(array) > 3;
			for (let i = 0; i < container.levels.length; i++) {
				const level = container.levels[i];

				// Use level.uncompressedByteLength for UASTC; for ETC1S it's 0.
				if (level.uncompressedByteLength) {
					uncompressedBytes += level.uncompressedByteLength;
				} else {
					const levelWidth = Math.max(1, Math.floor(container.pixelWidth / Math.pow(2, i)));
					const levelHeight = Math.max(1, Math.floor(container.pixelHeight / Math.pow(2, i)));
					const blockSize = hasAlpha ? 16 : 8;
					uncompressedBytes += (levelWidth / 4) * (levelHeight / 4) * blockSize;
				}
			}
		} else {
			for (const level of container.levels) {
				if (container.supercompressionScheme === KHR_SUPERCOMPRESSION_NONE) {
					uncompressedBytes += level.levelData.byteLength;
				} else {
					uncompressedBytes += level.uncompressedByteLength;
				}
			}
		}

		return uncompressedBytes;
	}
}
