import { GLTF } from '../types/gltf';

/** @hidden */
export class MathUtils {
	public static identity(v: number): number {
		return v;
	}

	public static denormalize(c: number, componentType: GLTF.AccessorComponentType): number {
		// Hardcode enums from accessor.ts to avoid a circular dependency.
		switch (componentType) {
			case 5126:
				return c;
			case 5123:
				return c / 65535.0;
			case 5121:
				return c / 255.0;
			case 5122:
				return Math.max(c / 32767.0, -1.0);
			case 5120:
				return Math.max(c / 127.0, -1.0);
		}

	}

	public static normalize(f: number, componentType: GLTF.AccessorComponentType): number {
		// Hardcode enums from accessor.ts to avoid a circular dependency.
		switch (componentType) {
			case 5126:
				return f;
			case 5123:
				return Math.round(f * 65535.0);
			case 5121:
				return Math.round(f * 255.0);
			case 5122:
				return Math.round(f * 32767.0);
			case 5120:
				return Math.round(f * 127.0);
		}
	}
}
