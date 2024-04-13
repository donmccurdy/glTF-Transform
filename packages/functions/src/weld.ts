import { Accessor, Document, Primitive, PropertyType, Transform, vec3 } from '@gltf-transform/core';
import { dedup } from './dedup.js';
import { prune } from './prune.js';
import { EMPTY_U32, QuantizedVertexStream, VertexStream, hashLookup } from './hash-table.js';
import { ceilPowerOfTwo, createIndices, createTransform, formatDeltaOp } from './utils.js';
import { compactPrimitive } from './compact-primitive.js';
import { remapPrimitive } from './remap-primitive.js';

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
 * (Approach #6) Keep #5 for lossless weld, but add an alterative stream,
 * QuantizedVertexStream, which provides a quantized view into the vertex
 * data and allows custom tolerance. Cannot guarantee that two vertices
 * within distance X will be joined given tolerance X, but much faster and
 * more memory-efficient than previous lossy implementations.
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
 */

const NAME = 'weld';

const Tolerance = {
	DEFAULT: 0.0,
	TEXCOORD: 0.0001, // [0, 1]
	COLOR: 0.01, // [0, 1]
	NORMAL: 0.0, // [-1, 1], 0.05 ~= ±3º
	JOINTS: 0.0, // [0, ∞]
	WEIGHTS: 0.01, // [0, ∞]
};

/** Options for the {@link weld} function. */
export interface WeldOptions {
	/** Tolerance for vertex positions, as a fraction of primitive AABB. */
	tolerance?: number;
	/** Tolerance for vertex normals, in radians. */
	toleranceNormal?: number;
	/** Whether to overwrite existing indices. */
	overwrite?: boolean;
	/**
	 * Whether to perform cleanup steps after completing the operation. Recommended, and enabled by
	 * default. Cleanup removes temporary resources created during the operation, but may also remove
	 * pre-existing unused or duplicate resources in the {@link Document}. Applications that require
	 * keeping these resources may need to disable cleanup, instead calling {@link dedup} and
	 * {@link prune} manually (with customized options) later in the processing pipeline.
	 * @experimental
	 */
	cleanup?: boolean;
}

export const WELD_DEFAULTS: Required<WeldOptions> = {
	tolerance: Tolerance.DEFAULT,
	toleranceNormal: Tolerance.NORMAL,
	overwrite: true,
	cleanup: true,
};

/**
 * Welds {@link Primitive Primitives}, merging similar vertices. When merged
 * and indexed, data is shared more efficiently between vertices. File size can
 * be reduced, and the GPU uses the vertex cache more efficiently.
 *
 * When welding, the 'tolerance' threshold determines which vertices qualify for
 * welding based on distance between the vertices as a fraction of the primitive's
 * bounding box (AABB). For example, tolerance=0.01 welds vertices within +/-1%
 * of the AABB's longest dimension. Other vertex attributes are also compared
 * during welding, with attribute-specific thresholds. For `tolerance=0`, welding
 * requires bitwise equality and completes more quickly.
 *
 * To preserve visual appearance consistently with non-zero `tolerance`, use low
 * `toleranceNormal` thresholds around 0.1 (±3º). To pre-processing a scene
 * before simplification or LOD creation, consider higher thresholds around 0.5 (±30º).
 *
 * Example:
 *
 * ```javascript
 * import { weld } from '@gltf-transform/functions';
 *
 * // Lossless and fast.
 * await document.transform(weld());
 *
 * // Lossy and slower.
 * await document.transform(weld({ tolerance: 0.001, toleranceNormal: 0.5 }));
 *
 * // Lossy and slowest, maximizing vertex count reduction.
 * await document.transform(weld({ tolerance: 0.001, toleranceNormal: 0.5, exhaustive: true }));
 * ```
 *
 * @category Transforms
 */
export function weld(_options: WeldOptions = WELD_DEFAULTS): Transform {
	const options = expandWeldOptions(_options);

	return createTransform(NAME, async (doc: Document): Promise<void> => {
		const logger = doc.getLogger();

		for (const mesh of doc.getRoot().listMeshes()) {
			for (const prim of mesh.listPrimitives()) {
				weldPrimitive(prim, options);

				if (isPrimEmpty(prim)) prim.dispose();
			}

			if (mesh.listPrimitives().length === 0) mesh.dispose();
		}

		// Welding removes degenerate meshes; prune leaf nodes afterward.
		if (options.cleanup) {
			await doc.transform(
				prune({
					propertyTypes: [PropertyType.ACCESSOR, PropertyType.NODE],
					keepAttributes: true,
					keepIndices: true,
					keepLeaves: false,
				}),
				dedup({ propertyTypes: [PropertyType.ACCESSOR] }),
			);
		}

		logger.debug(`${NAME}: Complete.`);
	});
}

/**
 * Welds a {@link Primitive}, merging similar vertices. When merged and
 * indexed, data is shared more efficiently between vertices. File size can
 * be reduced, and the GPU uses the vertex cache more efficiently.
 *
 * When welding, the 'tolerance' threshold determines which vertices qualify for
 * welding based on distance between the vertices as a fraction of the primitive's
 * bounding box (AABB). For example, tolerance=0.01 welds vertices within +/-1%
 * of the AABB's longest dimension. Other vertex attributes are also compared
 * during welding, with attribute-specific thresholds. For `tolerance=0`, welding
 * requires bitwise-equality and completes much faster.
 *
 * Example:
 *
 * ```javascript
 * import { weldPrimitive } from '@gltf-transform/functions';
 *
 * const mesh = document.getRoot().listMeshes()
 * 	.find((mesh) => mesh.getName() === 'Gizmo');
 *
 * for (const prim of mesh.listPrimitives()) {
 *   weldPrimitive(prim, {tolerance: 0});
 * }
 * ```
 */
export function weldPrimitive(prim: Primitive, _options: WeldOptions = WELD_DEFAULTS): void {
	const graph = prim.getGraph();
	const document = Document.fromGraph(graph)!;
	const options = expandWeldOptions(_options);

	if (prim.getIndices() && !_options.overwrite) return;
	if (prim.getMode() === Primitive.Mode.POINTS) return;

	const logger = document.getLogger();
	const srcVertexCount = prim.getAttribute('POSITION')!.getCount();
	const srcIndices = prim.getIndices();
	const srcIndicesArray = srcIndices?.getArray();
	const srcIndicesCount = srcIndices ? srcIndices.getCount() : srcVertexCount;

	let hash: VertexStream;
	if (options.tolerance === 0 && options.toleranceNormal === 0) {
		hash = new VertexStream(prim).init();
	} else {
		const toleranceEntries = prim
			.listSemantics()
			.map((semantic) => [semantic, getAttributeTolerance(prim, semantic, options)]);
		hash = new QuantizedVertexStream(prim, Object.fromEntries(toleranceEntries)).init();
	}

	const tableSize = ceilPowerOfTwo(srcVertexCount + srcVertexCount / 4);
	const table = new Uint32Array(tableSize).fill(EMPTY_U32);
	const writeMap = new Uint32Array(srcVertexCount).fill(EMPTY_U32); // oldIndex → newIndex

	// (1) Compare and identify indices to weld.

	let dstVertexCount = 0;

	for (let i = 0; i < srcIndicesCount; i++) {
		const srcIndex = srcIndicesArray ? srcIndicesArray[i] : i;
		if (writeMap[srcIndex] !== EMPTY_U32) continue;

		const hashIndex = hashLookup(table, tableSize, hash, srcIndex, EMPTY_U32);
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

const _a = [] as number[];
const _b = [] as number[];

/** Computes a per-attribute tolerance, based on domain and usage of the attribute. */
function getAttributeTolerance(prim: Primitive, semantic: string, options: Required<WeldOptions>): number {
	// Attributes like NORMAL and COLOR_# do not vary in range like POSITION,
	// so do not apply the given tolerance factor to these attributes.
	if (semantic === 'NORMAL' || semantic === 'TANGENT') return options.toleranceNormal;
	if (semantic.startsWith('COLOR_')) return Tolerance.COLOR;
	if (semantic.startsWith('TEXCOORD_')) return Tolerance.TEXCOORD;
	if (semantic.startsWith('JOINTS_')) return Tolerance.JOINTS;
	if (semantic.startsWith('WEIGHTS_')) return Tolerance.WEIGHTS;

	const attribute = prim.getAttribute(semantic)!;

	_a.length = _b.length = 0;
	attribute.getMinNormalized(_a);
	attribute.getMaxNormalized(_b);
	const diff = _b.map((bi, i) => bi - _a[i]);
	const range = Math.max(...diff);
	return options.tolerance * range;
}

function expandWeldOptions(_options: WeldOptions): Required<WeldOptions> {
	const options = { ...WELD_DEFAULTS, ..._options } as Required<WeldOptions>;

	if (options.tolerance < 0 || options.tolerance > 0.1) {
		throw new Error(`${NAME}: Requires 0 <= tolerance <= 0.1`);
	}

	if (options.toleranceNormal < 0 || options.toleranceNormal > Math.PI / 2) {
		throw new Error(`${NAME}: Requires 0 <= toleranceNormal <= ${(Math.PI / 2).toFixed(2)}`);
	}

	if (options.tolerance > 0) {
		options.tolerance = Math.max(options.tolerance, Number.EPSILON);
		options.toleranceNormal = Math.max(options.toleranceNormal, Number.EPSILON);
	}

	return options;
}

/**
 * For purposes of welding, we consider a primitive to be 'empty' or degenerate
 * if (1) it has an index, and (2) that index is empty. In some cases
 * (mode=POINTS) the index may be missing — this is outside the scope of welding.
 */
function isPrimEmpty(prim: Primitive): boolean {
	const indices = prim.getIndices();
	return !!indices && indices.getCount() === 0;
}
