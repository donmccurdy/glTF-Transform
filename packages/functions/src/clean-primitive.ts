import { ComponentTypeToTypedArray, Primitive } from '@gltf-transform/core';

/**
 * Removes degenerate triangles from the {@link Primitive}. Any triangle containing fewer than
 * three different vertex indices is considered degenerate. This method does not merge/weld
 * different vertices containing identical data — use {@link weld} first for that purpose.
 *
 * @internal
 */
export function cleanPrimitive(prim: Primitive): void {
	// TODO(feat): Clean degenerate primitives of other topologies.
	const indices = prim.getIndices();
	if (!indices || prim.getMode() !== Primitive.Mode.TRIANGLES) return;

	// TODO(perf): untyped array allocation
	const srcIndicesArray = indices.getArray()!;
	const dstIndicesArray = [];
	let maxIndex = -Infinity;

	for (let i = 0, il = srcIndicesArray.length; i < il; i += 3) {
		const a = srcIndicesArray[i];
		const b = srcIndicesArray[i + 1];
		const c = srcIndicesArray[i + 2];

		if (a === b || a === c || b === c) continue;

		dstIndicesArray.push(a, b, c);
		maxIndex = Math.max(maxIndex, a, b, c);
	}

	const TypedArray = ComponentTypeToTypedArray[indices.getComponentType()];
	indices.setArray(new TypedArray(dstIndicesArray));
}
