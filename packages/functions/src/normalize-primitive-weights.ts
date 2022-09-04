import type { Accessor, Primitive, PrimitiveTarget } from '@gltf-transform/core';

// TODO(bug): Works when adjusting for rounding error in quantized vertex
// attribute. But not for truncated weight sets, or non-normalized inputs.
export function normalizePrimitiveWeights(prim: Primitive | PrimitiveTarget): void {
	const vertexCount = prim.getAttribute('POSITION')!.getCount();
	const weightsEl: number[] = [];

	for (let i = 0; i < vertexCount; i++) {
		let vertexWeightsSum = 0;

		let leastWeight = Infinity;
		let leastIndex = -1;
		let leastAttribute: Accessor | null = null;

		let weights: Accessor | null;
		let attributeIndex = 0;

		// Find sum of weights and the joint with the lowest non-zero weight.
		while ((weights = prim.getAttribute(`WEIGHTS_${attributeIndex++}`))) {
			weights.getElement(i, weightsEl);
			for (let j = 0; j < weightsEl.length; j++) {
				vertexWeightsSum += weightsEl[j];
				if (weightsEl[j] > 0 && weightsEl[j] < leastWeight) {
					leastAttribute = weights;
					leastWeight = weightsEl[j];
					leastIndex = j;
				}
			}
		}

		// Normalize by updating least-significant joint weight.
		if (leastAttribute && vertexWeightsSum !== 1) {
			leastAttribute.getElement(i, weightsEl);
			weightsEl[leastIndex] += 1 - vertexWeightsSum;
			leastAttribute.setElement(i, weightsEl);
		}
	}
}
