import { GLTF } from '../types/gltf';

/** @hidden */
export class MathUtils {
	public static identity(v: number): number {
		return v;
	}

	public static denormalize(c: number, componentType: GLTF.AccessorComponentType): number {
		switch (componentType) {
			case GLTF.AccessorComponentType.FLOAT:
				return c;
			case GLTF.AccessorComponentType.UNSIGNED_SHORT:
				return c / 65535.0;
			case GLTF.AccessorComponentType.UNSIGNED_BYTE:
				return c / 255.0;
			case GLTF.AccessorComponentType.SHORT:
				return Math.max(c / 32767.0, -1.0);
			case GLTF.AccessorComponentType.BYTE:
				return Math.max(c / 127.0, -1.0);
		}

	}

	public static normalize(f: number, componentType: GLTF.AccessorComponentType): number {
		switch (componentType) {
			case GLTF.AccessorComponentType.FLOAT:
				return f;
			case GLTF.AccessorComponentType.UNSIGNED_SHORT:
				return Math.round(f * 65535.0);
			case GLTF.AccessorComponentType.UNSIGNED_BYTE:
				return Math.round(f * 255.0);
			case GLTF.AccessorComponentType.SHORT:
				return Math.round(f * 32767.0);
			case GLTF.AccessorComponentType.BYTE:
				return Math.round(f * 127.0);
		}
	}
}
