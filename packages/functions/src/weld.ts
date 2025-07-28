import { Document, Primitive, type Transform } from '@gltf-transform/core';
import { compactPrimitive } from './compact-primitive.js';
import { getPrimitiveVertexCount, VertexCountMethod } from './get-vertex-count.js';
import { EMPTY_U32, hashLookup, VertexStream } from './hash-table.js';
import { assignDefaults, ceilPowerOfTwo, createTransform, deepDisposePrimitive, formatDeltaOp } from './utils.js';

/**
 * CONTRIBUTOR NOTES
 *
 * Ideally a weld() implementation should be fast, robust, and tunable. The
 * writeup below tracks my attempts to solve for these constraints.
 *
 * (Approach #1) Follow the mergeVertices() implementation of three.js,
 * hashing vertices with a string concatenation of all vertex attributes.
 * The approach does not allow per-attribute tolerance in local units.
 *
 * (Approach #2) Sort points along the X axis, then make cheaper
 * searches up/down the sorted list for merge candidates. While this allows
 * simpler comparison based on specified tolerance, it's much slower, even
 * for cases where choice of the X vs. Y or Z axes is reasonable.
 *
 * (Approach #3) Attempted a Delaunay triangulation in three dimensions,
 * expecting it would be an n * log(n) algorithm, but the only implementation
 * I found (with delaunay-triangulate) appeared to be much slower than that,
 * and was notably slower than the sort-based approach, just building the
 * Delaunay triangulation alone.
 *
 * (Approach #4) Hybrid of (1) and (2), assigning vertices to a spatial
 * grid, then searching the local neighborhood (27 cells) for weld candidates.
 *
 * (Approach #5) Based on Meshoptimizer's implementation, when tolerance=0
 * use a hashtable to find bitwise-equal vertices quickly. Vastly faster than
 * previous approaches, but without tolerance options.
 *
 * RESULTS: For the "Lovecraftian" sample model linked below, after joining,
 * a primitive with 873,000 vertices can be welded down to 230,000 vertices.
 * https://sketchfab.com/3d-models/sculpt-january-day-19-lovecraftian-34ad2501108e4fceb9394f5b816b9f42
 *
 * - (1) Not tested, but prior results suggest not robust enough.
 * - (2) 30s
 * - (3) 660s
 * - (4) 5s exhaustive, 1.5s non-exhaustive
 * - (5) 0.2s
 *
 * As of April 2024, the lossy weld was removed, leaving only approach #5. An
 * upcoming Meshoptimizer release will include a simplifyWithAttributes
 * function allowing simplification with weighted consideration of vertex
 * attributes, which I hope to support. With that, weld() may remain faster,
 * simpler, and more maintainable.
 */

const NAME = 'weld';

/** Options for the {@link weld} function. */
export interface WeldOptions {
	/** Whether to overwrite existing indices. */
	overwrite?: boolean;
}

export const WELD_DEFAULTS: Required<WeldOptions> = {
	overwrite: true,
};

/**
 * Welds {@link Primitive Primitives}, merging bitwise identical vertices. When
 * merged and indexed, data is shared more efficiently between vertices. File size
 * can be reduced, and the GPU uses the vertex cache more efficiently.
 *
 * Example:
 *
 * ```javascript
 * import { weld, getSceneVertexCount, VertexCountMethod } from '@gltf-transform/functions';
 *
 * const scene = document.getDefaultScene();
 * const srcVertexCount = getSceneVertexCount(scene, VertexCountMethod.UPLOAD);
 * await document.transform(weld());
 * const dstVertexCount = getSceneVertexCount(scene, VertexCountMethod.UPLOAD);
 * ```
 *
 * @category Transforms
 */
export function weld(_options: WeldOptions = WELD_DEFAULTS): Transform {
	const options = assignDefaults(WELD_DEFAULTS, _options);

	return createTransform(NAME, async (doc: Document): Promise<void> => {
		const logger = doc.getLogger();

		for (const mesh of doc.getRoot().listMeshes()) {
			for (const prim of mesh.listPrimitives()) {
				weldPrimitive(prim, options);

				if (getPrimitiveVertexCount(prim, VertexCountMethod.RENDER) === 0) {
					deepDisposePrimitive(prim);
				}
			}

			if (mesh.listPrimitives().length === 0) mesh.dispose();
		}

		logger.debug(`${NAME}: Complete.`);
	});
}

/**
 * Welds a {@link Primitive}, merging bitwise identical vertices. When merged
 * and indexed, data is shared more efficiently between vertices. File size can
 * be reduced, and the GPU uses the vertex cache more efficiently.
 *
 * Example:
 *
 * ```javascript
 * import { weldPrimitive, getMeshVertexCount, VertexCountMethod } from '@gltf-transform/functions';
 *
 * const mesh = document.getRoot().listMeshes()
 * 	.find((mesh) => mesh.getName() === 'Gizmo');
 *
 * const srcVertexCount = getMeshVertexCount(mesh, VertexCountMethod.UPLOAD);
 *
 * for (const prim of mesh.listPrimitives()) {
 *   weldPrimitive(prim);
 * }
 *
 * const dstVertexCount = getMeshVertexCount(mesh, VertexCountMethod.UPLOAD);
 * ```
 */
export function weldPrimitive(prim: Primitive, _options: WeldOptions = WELD_DEFAULTS): void {
	const graph = prim.getGraph();
	const document = Document.fromGraph(graph)!;
	const logger = document.getLogger();
	const options = { ...WELD_DEFAULTS, ..._options };

	if (prim.getIndices() && !options.overwrite) return;
	if (prim.getMode() === Primitive.Mode.POINTS) return;

	const srcVertexCount = prim.getAttribute('POSITION')!.getCount();
	const srcIndices = prim.getIndices();
	const srcIndicesArray = srcIndices?.getArray();
	const srcIndicesCount = srcIndices ? srcIndices.getCount() : srcVertexCount;

	const stream = new VertexStream(prim);
	const tableSize = ceilPowerOfTwo(srcVertexCount + srcVertexCount / 4);
	const table = new Uint32Array(tableSize).fill(EMPTY_U32);
	const writeMap = new Uint32Array(srcVertexCount).fill(EMPTY_U32); // oldIndex → newIndex

	// (1) Compare and identify indices to weld.

	let dstVertexCount = 0;

	for (let i = 0; i < srcIndicesCount; i++) {
		const srcIndex = srcIndicesArray ? srcIndicesArray[i] : i;
		if (writeMap[srcIndex] !== EMPTY_U32) continue;

		const hashIndex = hashLookup(table, tableSize, stream, srcIndex, EMPTY_U32);
		const dstIndex = table[hashIndex];

		if (dstIndex === EMPTY_U32) {
			table[hashIndex] = srcIndex;
			writeMap[srcIndex] = dstVertexCount++;
		} else {
			writeMap[srcIndex] = writeMap[dstIndex];
		}
	}

	logger.debug(`${NAME}: ${formatDeltaOp(srcVertexCount, dstVertexCount)} vertices.`);

	compactPrimitive(prim, writeMap, dstVertexCount);
}
