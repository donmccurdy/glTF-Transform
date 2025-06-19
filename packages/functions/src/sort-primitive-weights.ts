import {
	type Accessor,
	type GLTF,
	MathUtils,
	type Primitive,
	type PrimitiveTarget,
	type TypedArray,
	type vec4,
} from '@gltf-transform/core';

/**
 * Sorts skinning weights from high to low, for each vertex of the input
 * {@link Primitive} or {@link PrimitiveTarget}, and normalizes the weights.
 * Optionally, uses the given 'limit' to remove least-significant joint
 * influences such that no vertex has more than 'limit' influences.
 *
 * Most realtime engines support a limited number of joint influences per vertex,
 * often 4 or 8. Sorting and removing the additional influences can reduce file
 * size and improve compatibility.
 *
 * Example:
 *
 * ```javascript
 * import { sortPrimitiveWeights } from '@gltf-transform/functions';
 *
 * const limit = 4;
 * for (const mesh of document.getRoot().listMeshes()) {
 * 	for (const prim of mesh.listPrimitives()) {
 * 		sortPrimitiveWeights(prim, limit);
 * 	}
 * }
 * ```
 *
 * @param prim Input, to be modified in place.
 * @param limit Maximum number of joint influences per vertex. Must be a multiple of four.
 */
export function sortPrimitiveWeights(prim: Primitive | PrimitiveTarget, limit: number = Infinity): void {
	if ((Number.isFinite(limit) && limit % 4) || limit <= 0) {
		throw new Error(`Limit must be positive multiple of four.`);
	}

	const vertexCount = prim.getAttribute('POSITION')!.getCount();
	const setCount = prim.listSemantics().filter((name) => name.startsWith('WEIGHTS_')).length;

	// (1) Sort.

	const indices = new Uint16Array(setCount * 4);
	const srcWeights = new Float32Array(setCount * 4);
	const dstWeights = new Float32Array(setCount * 4);
	const srcJoints = new Uint32Array(setCount * 4);
	const dstJoints = new Uint32Array(setCount * 4);

	for (let i = 0; i < vertexCount; i++) {
		getVertexArray(prim, i, 'WEIGHTS', srcWeights);
		getVertexArray(prim, i, 'JOINTS', srcJoints);

		// Sort indices to create a lookup table, indices[dstIndex] → srcIndex,
		// indexed into the weights and joints arrays.
		for (let j = 0; j < setCount * 4; j++) indices[j] = j;
		indices.sort((a, b) => (srcWeights[a] > srcWeights[b] ? -1 : 1));

		// Sort weights and joints.
		for (let j = 0; j < indices.length; j++) {
			dstWeights[j] = srcWeights[indices[j]];
			dstJoints[j] = srcJoints[indices[j]];
		}

		setVertexArray(prim, i, 'WEIGHTS', dstWeights);
		setVertexArray(prim, i, 'JOINTS', dstJoints);
	}

	// (2) Limit.
	for (let i = setCount; i * 4 > limit; i--) {
		const weights = prim.getAttribute(`WEIGHTS_${i - 1}`)!;
		const joints = prim.getAttribute(`JOINTS_${i - 1}`)!;
		prim.setAttribute(`WEIGHTS_${i - 1}`, null);
		prim.setAttribute(`JOINTS_${i - 1}`, null);
		if (weights.listParents().length === 1) weights.dispose();
		if (joints.listParents().length === 1) joints.dispose();
	}

	// (3) Normalize.
	normalizePrimitiveWeights(prim);
}

// Utilities.

type PrimLike = Primitive | PrimitiveTarget;

function normalizePrimitiveWeights(prim: PrimLike): void {
	// TODO(feat): Convert attributes to same component types when necessary.
	if (!isNormalizeSafe(prim)) return;

	const vertexCount = prim.getAttribute('POSITION')!.getCount();
	const setCount = prim.listSemantics().filter((name) => name.startsWith('WEIGHTS_')).length;

	const templateAttribute = prim.getAttribute('WEIGHTS_0')!;
	const templateArray = templateAttribute.getArray()!;
	const componentType = templateAttribute.getComponentType();
	const normalized = templateAttribute.getNormalized();
	const normalizedComponentType = normalized ? componentType : undefined;
	const delta = normalized ? MathUtils.decodeNormalizedInt(1, componentType) : Number.EPSILON;
	const joints = new Uint32Array(setCount * 4).fill(0);
	const weights = templateArray.slice(0, setCount * 4).fill(0);

	for (let i = 0; i < vertexCount; i++) {
		getVertexArray(prim, i, 'JOINTS', joints);
		getVertexArray(prim, i, 'WEIGHTS', weights, normalizedComponentType);

		let weightsSum = sum(weights, normalizedComponentType);

		if (weightsSum !== 0 && weightsSum !== 1) {
			// (1) If sum of weights not within δ of 1, renormalize all weights.
			if (Math.abs(1 - weightsSum) > delta) {
				for (let j = 0; j < weights.length; j++) {
					if (normalized) {
						const floatValue = MathUtils.decodeNormalizedInt(weights[j], componentType);
						weights[j] = MathUtils.encodeNormalizedInt(floatValue / weightsSum, componentType);
					} else {
						weights[j] /= weightsSum;
					}
				}
			}

			weightsSum = sum(weights, normalizedComponentType);

			// (2) Sum of normalized weights may still be off by δ. Compensate
			// in least-significant weight.
			if (normalized && weightsSum !== 1) {
				for (let j = weights.length - 1; j >= 0; j--) {
					if (weights[j] > 0) {
						// Normalized integer encoding will clamp negative values, so separate the sign.
						const delta = 1 - weightsSum;
						weights[j] += Math.sign(delta) * MathUtils.encodeNormalizedInt(Math.abs(delta), componentType);
						break;
					}
				}
			}
		}

		// (3) Remove joint indices whose weights have fallen to zero.
		for (let j = weights.length - 1; j >= 0; j--) {
			if (weights[j] === 0) {
				joints[j] = 0;
			}
		}

		setVertexArray(prim, i, 'JOINTS', joints);
		setVertexArray(prim, i, 'WEIGHTS', weights, normalizedComponentType);
	}
}

/** Lists all values of a multi-set vertex attribute (WEIGHTS_#, ...) for given vertex. */
function getVertexArray(
	prim: PrimLike,
	vertexIndex: number,
	prefix: string,
	target: TypedArray,
	normalizedComponentType?: GLTF.AccessorComponentType,
): TypedArray {
	let weights: Accessor | null;
	const el = [0, 0, 0, 0] as vec4;
	for (let i = 0; (weights = prim.getAttribute(`${prefix}_${i}`)); i++) {
		weights.getElement(vertexIndex, el);
		for (let j = 0; j < 4; j++) {
			if (normalizedComponentType) {
				target[i * 4 + j] = MathUtils.encodeNormalizedInt(el[j], normalizedComponentType);
			} else {
				target[i * 4 + j] = el[j];
			}
		}
	}
	return target;
}

/** Sets all values of a multi-set vertex attribute (WEIGHTS_#, ...) for given vertex. */
function setVertexArray(
	prim: PrimLike,
	vertexIndex: number,
	prefix: string,
	values: TypedArray,
	normalizedComponentType?: GLTF.AccessorComponentType,
): void {
	let weights: Accessor | null;
	const el = [0, 0, 0, 0] as vec4;
	for (let i = 0; (weights = prim.getAttribute(`${prefix}_${i}`)); i++) {
		for (let j = 0; j < 4; j++) {
			if (normalizedComponentType) {
				el[j] = MathUtils.decodeNormalizedInt(values[i * 4 + j], normalizedComponentType);
			} else {
				el[j] = values[i * 4 + j];
			}
		}
		weights.setElement(vertexIndex, el);
	}
}

/** Sum an array of numbers. */
function sum(values: TypedArray, normalizedComponentType?: GLTF.AccessorComponentType): number {
	let sum = 0;
	for (let i = 0; i < values.length; i++) {
		if (normalizedComponentType) {
			sum += MathUtils.decodeNormalizedInt(values[i], normalizedComponentType);
		} else {
			sum += values[i];
		}
	}
	return sum;
}

/** Returns true if attribute normalization is supported for this primitive. */
function isNormalizeSafe(prim: PrimLike): boolean {
	const attributes = prim
		.listSemantics()
		.filter((name) => name.startsWith('WEIGHTS_'))
		.map((name) => prim.getAttribute(name)!);
	const normList = attributes.map((a) => a.getNormalized());
	const typeList = attributes.map((a) => a.getComponentType());
	return new Set(normList).size === 1 && new Set(typeList).size === 1;
}
