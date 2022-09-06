import { Accessor, MathUtils, Primitive, PrimitiveTarget, TypedArray, vec4 } from '@gltf-transform/core';

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
export function sortPrimitiveWeights(prim: Primitive | PrimitiveTarget, limit = Infinity) {
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
		getVertexElements(prim, i, 'WEIGHTS', srcWeights);
		getVertexElements(prim, i, 'JOINTS', srcJoints);

		// Sort indices to create a lookup table, indices[dstIndex] → srcIndex,
		// indexed into the weights and joints arrays.
		for (let j = 0; j < setCount * 4; j++) indices[j] = j;
		indices.sort((a, b) => (srcWeights[a] > srcWeights[b] ? -1 : 1));

		// Sort weights and joints.
		for (let j = 0; j < indices.length; j++) {
			dstWeights[j] = srcWeights[indices[j]];
			dstJoints[j] = srcJoints[indices[j]];
		}

		setVertexElements(prim, i, 'WEIGHTS', dstWeights);
		setVertexElements(prim, i, 'JOINTS', dstJoints);
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
	// Would prefer to warn if unsafe, but no logger accessible in this scope.
	if (!isNormalizeSafe(prim)) return;

	const vertexCount = prim.getAttribute('POSITION')!.getCount();
	const setCount = prim.listSemantics().filter((name) => name.startsWith('WEIGHTS_')).length;

	const templateAttribute = prim.getAttribute('WEIGHTS_0')!;
	const templateArray = templateAttribute.getArray()!;
	const componentType = templateAttribute.getComponentType();
	const normalized = templateAttribute.getNormalized();
	const delta = normalized ? MathUtils.denormalize(1, componentType) : Number.EPSILON;
	const weights = templateArray.slice(0, setCount * 4).fill(0);

	for (let i = 0; i < vertexCount; i++) {
		getVertexElements(prim, i, 'WEIGHTS', weights);

		let weightsSum = sum(weights);
		if (weightsSum === 0) continue;

		// (1) If sum of weights not within δ of 1, renormalize all weights.
		if (Math.abs(1 - weightsSum) > delta) {
			for (let j = 0; j < weights.length; j++) {
				if (normalized) {
					const intValue = MathUtils.normalize(weights[j] / weightsSum, componentType);
					weights[j] = MathUtils.denormalize(intValue, componentType);
				} else {
					weights[j] /= weightsSum;
				}
			}
		}

		weightsSum = sum(weights);

		// (2) Sum of normalized weights may still be off by δ. Compensate
		// in least-significant weight.
		if (normalized && weightsSum !== 1) {
			for (let j = weights.length - 1; j >= 0; j--) {
				if (weights[j] > 0) {
					weights[j] += 1 - weightsSum;
					break;
				}
			}
		}

		setVertexElements(prim, i, 'WEIGHTS', weights);
	}
}

/** Lists all values of a multi-set vertex attribute (WEIGHTS_#, ...) for given vertex. */
function getVertexElements(prim: PrimLike, vertexIndex: number, prefix: string, target: TypedArray): TypedArray {
	let weights: Accessor | null;
	const el = [0, 0, 0, 0] as vec4;
	for (let i = 0; (weights = prim.getAttribute(`${prefix}_${i}`)); i++) {
		weights.getElement(vertexIndex, el);
		for (let j = 0; j < 4; j++) target[i * 4 + j] = el[j];
	}
	return target;
}

/** Sets all values of a multi-set vertex attribute (WEIGHTS_#, ...) for given vertex. */
function setVertexElements(prim: PrimLike, vertexIndex: number, prefix: string, values: TypedArray): void {
	let weights: Accessor | null;
	const el = [0, 0, 0, 0] as vec4;
	for (let i = 0; (weights = prim.getAttribute(`${prefix}_${i}`)); i++) {
		for (let j = 0; j < 4; j++) el[j] = values[i * 4 + j];
		weights.setElement(vertexIndex, el);
	}
}

/** Sum an array of numbers. */
function sum(values: TypedArray): number {
	let sum = 0;
	for (let i = 0; i < values.length; i++) sum += values[i];
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
