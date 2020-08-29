import { vec3, vec4 } from '../constants';

/**
 * # ColorUtils
 *
 * *Common utilities for working with colors in vec3, vec4, or hexadecimal form.*
 *
 * @category Utilities
 */
export class ColorUtils {
	/** Converts sRGB hexadecimal to linear components. */
	static hexToFactor<T = vec3 | vec4>(hex: number, target: T): T {
		hex = Math.floor( hex );
		target[0] = ( hex >> 16 & 255 ) / 255;
		target[1] = ( hex >> 8 & 255 ) / 255;
		target[2] = ( hex & 255 ) / 255;
		return this.convertSRGBToLinear<T>(target, target);
	}

	/** Converts linear components to sRGB hexadecimal. */
	static factorToHex<T = vec3 | vec4>(factor: T): number {
		const target = [...factor as unknown as number[]] as unknown as T;
		const [r, g, b] = this.convertLinearToSRGB(factor, target) as unknown as number[];
		return ( r * 255 ) << 16 ^ ( g * 255 ) << 8 ^ ( b * 255 ) << 0;
	}

	/** Converts sRGB components to linear components. */
	static convertSRGBToLinear<T = vec3 | vec4>(source: T, target: T): T {
		for (let i = 0 ; i < 3; i++) {
			target[i] = ( source[i] < 0.04045 )
				? source[i] * 0.0773993808
				: Math.pow( source[i] * 0.9478672986 + 0.0521327014, 2.4 );
		}
		return target;
	}

	/** Converts linear components to sRGB components. */
	static convertLinearToSRGB<T = vec3 | vec4>(source: T, target: T): T {
		for (let i = 0; i < 3; i++) {
			target[i] = ( source[i] < 0.0031308 )
				? source[i] * 12.92
				: 1.055 * ( Math.pow( source[i], 0.41666 ) ) - 0.055;
		}
		return target;
	}
}
