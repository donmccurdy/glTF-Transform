import type { vec3, vec4 } from '../constants.js';

/**
 * *Common utilities for working with colors in vec3, vec4, or hexadecimal form.*
 *
 * Provides methods to convert linear components (vec3, vec4) to sRGB hex values. All colors in
 * the glTF specification, excluding color textures, are linear. Hexadecimal values, in sRGB
 * colorspace, are accessible through helper functions in the API as a convenience.
 *
 * ```typescript
 * // Hex (sRGB) to factor (linear).
 * const factor = ColorUtils.hexToFactor(0xFFCCCC, []);
 *
 * // Factor (linear) to hex (sRGB).
 * const hex = ColorUtils.factorToHex([1, .25, .25])
 * ```
 *
 * @category Utilities
 */
export class ColorUtils {
	/**
	 * Converts sRGB hexadecimal to linear components.
	 * @typeParam T vec3 or vec4 linear components.
	 */
	static hexToFactor<T = vec3 | vec4>(hex: number, target: T): T {
		hex = Math.floor(hex);
		const _target = target as unknown as vec3;
		_target[0] = ((hex >> 16) & 255) / 255;
		_target[1] = ((hex >> 8) & 255) / 255;
		_target[2] = (hex & 255) / 255;
		return this.convertSRGBToLinear<T>(target, target);
	}

	/**
	 * Converts linear components to sRGB hexadecimal.
	 * @typeParam T vec3 or vec4 linear components.
	 */
	static factorToHex<T = vec3 | vec4>(factor: T): number {
		const target = [...(factor as unknown as number[])] as unknown as T;
		const [r, g, b] = this.convertLinearToSRGB(factor, target) as unknown as number[];
		return ((r * 255) << 16) ^ ((g * 255) << 8) ^ ((b * 255) << 0);
	}

	/**
	 * Converts sRGB components to linear components.
	 * @typeParam T vec3 or vec4 linear components.
	 */
	static convertSRGBToLinear<T = vec3 | vec4>(source: T, target: T): T {
		const _source = source as unknown as vec3;
		const _target = target as unknown as vec3;
		for (let i = 0; i < 3; i++) {
			_target[i] =
				_source[i] < 0.04045
					? _source[i] * 0.0773993808
					: Math.pow(_source[i] * 0.9478672986 + 0.0521327014, 2.4);
		}
		return target;
	}

	/**
	 * Converts linear components to sRGB components.
	 * @typeParam T vec3 or vec4 linear components.
	 */
	static convertLinearToSRGB<T = vec3 | vec4>(source: T, target: T): T {
		const _source = source as unknown as vec3;
		const _target = target as unknown as vec3;
		for (let i = 0; i < 3; i++) {
			_target[i] = _source[i] < 0.0031308 ? _source[i] * 12.92 : 1.055 * Math.pow(_source[i], 0.41666) - 0.055;
		}
		return target;
	}
}
