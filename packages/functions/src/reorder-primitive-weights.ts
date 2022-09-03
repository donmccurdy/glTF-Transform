import type { Primitive, PrimitiveTarget, vec4 } from '@gltf-transform/core';
import { normalizePrimitiveWeights } from './normalize-primitive-weights';

export function reorderPrimitiveWeights(prim: Primitive | PrimitiveTarget, limit = Infinity) {
	if ((Number.isFinite(limit) && limit % 4) || limit <= 0) {
		throw new Error(`Limit must be a positive multiple of four.`);
	}

	const vertexCount = prim.getAttribute('POSITION')!.getCount();
	const setCount = prim.listSemantics().filter((name) => name.startsWith('WEIGHTS_')).length;

	// (1) Sort.

	const indices = new Uint16Array(setCount * 4);
	const weights = new Float32Array(setCount * 4);
	const joints = new Uint32Array(setCount * 4);

	const weightsEl = [0, 0, 0, 0] as vec4;
	const jointsEl = [0, 0, 0, 0] as vec4;

	for (let i = 0; i < vertexCount; i++) {
		for (let j = 0; j < setCount; j++) {
			const weightsAttribute = prim.getAttribute(`WEIGHTS_${j}`)!;
			const jointsAttribute = prim.getAttribute(`JOINTS_${j}`)!;
			weights.set(weightsAttribute.getElement(i, weightsEl), j * 4);
			joints.set(jointsAttribute.getElement(i, jointsEl), j * 4);
		}

		// Sort indices to create a lookup table, indices[dstIndex] → srcIndex,
		// indexed into the weights and joints arrays.
		for (let j = 0; j < setCount * 4; j++) indices[j] = j;
		indices.sort((a, b) => (weights[a] > weights[b] ? 1 : -1));

		for (let j = 0; j < setCount; j++) {
			const weightsAttribute = prim.getAttribute(`WEIGHTS_${j}`)!;
			const jointsAttribute = prim.getAttribute(`JOINTS_${j}`)!;

			for (let k = 0; k < 4; k++) {
				const dstIndex = j * 4 + k;
				const srcIndex = indices[dstIndex];
				weightsEl[k] = weights[srcIndex];
				jointsEl[k] = joints[srcIndex];
			}

			weightsAttribute.setElement(i, weightsEl);
			jointsAttribute.setElement(i, jointsEl);
		}
	}

	// (2) Limit.
	for (let i = setCount; i * 4 > limit; i--) {
		prim.getAttribute(`WEIGHTS_${i - 1}`)!.dispose();
		prim.getAttribute(`JOINTS_${i - 1}`)!.dispose();
	}

	// (3) Normalize.
	normalizePrimitiveWeights(prim);
}
