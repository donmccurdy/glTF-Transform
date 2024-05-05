import { MeshStandardMaterial } from 'three';

export * from './Observable.js';

export function eq(a: number[], b: number[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}

// https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#default-material
export const DEFAULT_MATERIAL = new MeshStandardMaterial({
	name: '__DefaultMaterial',
	color: 0xffffff,
	roughness: 1.0,
	metalness: 1.0,
});

export function semanticToAttributeName(semantic: string): string {
	switch (semantic) {
		case 'POSITION':
			return 'position';
		case 'NORMAL':
			return 'normal';
		case 'TANGENT':
			return 'tangent';
		case 'COLOR_0':
			return 'color';
		case 'JOINTS_0':
			return 'skinIndex';
		case 'WEIGHTS_0':
			return 'skinWeight';
		case 'TEXCOORD_0':
			return 'uv';
		case 'TEXCOORD_1':
			return 'uv1';
		case 'TEXCOORD_2':
			return 'uv2';
		case 'TEXCOORD_3':
			return 'uv3';
		default:
			return '_' + semantic.toLowerCase();
	}
}
