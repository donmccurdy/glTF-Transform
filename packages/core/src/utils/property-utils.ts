import type { Ref, RefList, RefMap, RefSet } from 'property-graph';
import type { BufferViewUsage } from '../constants.js';
import type { Property } from '../properties/index.js';
import { isPlainObject } from './is-plain-object.js';

export type UnknownRef = Ref<Property> | RefList<Property> | RefSet<Property> | RefMap<Property>;

export function equalsRef(refA: Ref<Property>, refB: Ref<Property>, depth: number): boolean {
	if (!!refA !== !!refB) return false;

	const a = refA.getChild()!;
	const b = refB.getChild()!;
	const isEqualByRef = a === b;

	if (isEqualByRef) return true;
	if (depth <= 0) return isEqualByRef;
	return a.equals(b, undefined, depth - 1);
}

export function equalsRefSet<
	A extends RefList<Property> | RefSet<Property>,
	B extends RefList<Property> | RefSet<Property>,
>(refSetA: A, refSetB: B, depth: number): boolean {
	if (!!refSetA !== !!refSetB) return false;
	const refValuesA = refSetA.values();
	const refValuesB = refSetB.values();
	if (refValuesA.length !== refValuesB.length) return false;

	for (let i = 0; i < refValuesA.length; i++) {
		const a = refValuesA[i];
		const b = refValuesB[i];
		const isEqualByRef = a.getChild() === b.getChild();

		if (isEqualByRef) continue;
		if (depth <= 0) return false;
		if (!a.getChild().equals(b.getChild(), undefined, depth - 1)) return false;
	}

	return true;
}

export function equalsRefMap(refMapA: RefMap<Property>, refMapB: RefMap<Property>, depth: number): boolean {
	if (!!refMapA !== !!refMapB) return false;

	const keysA = refMapA.keys();
	const keysB = refMapB.keys();
	if (keysA.length !== keysB.length) return false;

	for (const key of keysA) {
		const refA = refMapA.get(key)!;
		const refB = refMapB.get(key)!;
		if (!!refA !== !!refB) return false;

		const a = refA.getChild();
		const b = refB.getChild();
		const isEqualByRef = a === b;

		if (isEqualByRef) continue;
		if (depth <= 0) return false;
		if (!a.equals(b, undefined, depth - 1)) return false;
	}

	return true;
}

export function equalsArray(a: ArrayLike<unknown> | null, b: ArrayLike<unknown> | null): boolean {
	if (a === b) return true;

	if (!!a !== !!b || !a || !b) return false;

	if (a.length !== b.length) return false;

	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}

	return true;
}

export function equalsObject(_a: unknown, _b: unknown): boolean {
	if (_a === _b) return true;
	if (!!_a !== !!_b) return false;
	if (!isPlainObject(_a) || !isPlainObject(_b)) {
		return _a === _b;
	}

	const a = _a as Record<string, unknown>;
	const b = _b as Record<string, unknown>;

	let numKeysA = 0;
	let numKeysB = 0;

	let key: string;

	for (key in a) numKeysA++;
	for (key in b) numKeysB++;
	if (numKeysA !== numKeysB) return false;

	for (key in a) {
		const valueA = a[key];
		const valueB = b[key];
		if (isArray(valueA) && isArray(valueB)) {
			if (!equalsArray(valueA as [], valueB as [])) return false;
		} else if (isPlainObject(valueA) && isPlainObject(valueB)) {
			if (!equalsObject(valueA, valueB)) return false;
		} else {
			if (valueA !== valueB) return false;
		}
	}

	return true;
}

export type RefAttributes = Record<string, unknown>;

export interface AccessorRefAttributes extends RefAttributes {
	/** Usage role of an accessor reference. */
	usage: BufferViewUsage | string;
}

export interface TextureRefAttributes extends RefAttributes {
	/** Bitmask for {@link TextureChannel TextureChannels} used by a texture reference. */
	channels: number;
	/**
	 * Specifies that the texture contains color data (base color, emissive, …),
	 * rather than non-color data (normal maps, metallic roughness, …). Used
	 * when tuning texture compression settings.
	 */
	isColor?: boolean;
}

export function isArray(value: unknown): boolean {
	return Array.isArray(value) || ArrayBuffer.isView(value);
}
