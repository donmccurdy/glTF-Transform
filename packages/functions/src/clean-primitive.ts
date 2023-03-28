import type { Primitive } from '@gltf-transform/core';
import { createIndices } from './utils.js';

/**
 * Removes degenerate triangles from the {@link Primitive}. Any triangle containing fewer than
 * three different vertex indices is considered degenerate. This method does not merge/weld
 * different vertices containing identical data — use {@link weld} first for that purpose.
 *
 * @internal
 */
export function cleanPrimitive(prim: Primitive): void {
	const indices = prim.getIndices();
	if (!indices) return;

	const tmpIndicesArray = [];
	let maxIndex = -Infinity;

	for (let i = 0, il = indices.getCount(); i < il; i += 3) {
		const a = indices.getScalar(i);
		const b = indices.getScalar(i + 1);
		const c = indices.getScalar(i + 2);

		if (a === b || a === c || b === c) continue;

		tmpIndicesArray.push(a, b, c);
		maxIndex = Math.max(maxIndex, a, b, c);
	}

	const dstIndicesArray = createIndices(tmpIndicesArray.length, maxIndex);
	dstIndicesArray.set(tmpIndicesArray);
	indices.setArray(dstIndicesArray);
}
