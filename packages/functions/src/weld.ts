import { Accessor, BufferUtils, Document, Primitive, PropertyType, Transform, vec3 } from '@gltf-transform/core';
import { dedup } from './dedup.js';
import { prune } from './prune.js';
import {
	ceilPowerOfTwo,
	createIndices,
	createTransform,
	deepListAttributes,
	formatDeltaOp,
	remapPrimitive,
} from './utils.js';

// DEVELOPER NOTES: Ideally a weld() implementation should be fast, robust,
// and tunable. The writeup below tracks my attempts to solve for these
// constraints.
//
// (Approach #1) Follow the mergeVertices() implementation of three.js,
// hashing vertices with a string concatenation of all vertex attributes.
// The approach does not allow per-attribute tolerance in local units.
//
// (Approach #2) Sort points along the X axis, then make cheaper
// searches up/down the sorted list for merge candidates. While this allows
// simpler comparison based on specified tolerance, it's much slower, even
// for cases where choice of the X vs. Y or Z axes is reasonable.
//
// (Approach #3) Attempted a Delaunay triangulation in three dimensions,
// expecting it would be an n * log(n) algorithm, but the only implementation
// I found (with delaunay-triangulate) appeared to be much slower than that,
// and was notably slower than the sort-based approach, just building the
// Delaunay triangulation alone.
//
// (Approach #4) Hybrid of (1) and (2), assigning vertices to a spatial
// grid, then searching the local neighborhood (27 cells) for weld candidates.
//
// (Approach #5) ... TODO(DO NOT SUBMIT): Document new implementation.
//
// RESULTS: For the "Lovecraftian" sample model, after joining, a primitive
// with 873,000 vertices can be welded down to 230,000 vertices. Results:
// - (1) Not tested, but prior results suggest not robust enough.
// - (2) 30 seconds
// - (3) 660 seconds
// - (4) 5 seconds exhaustive, 1.5s non-exhaustive

const NAME = 'weld';

/** Flags 'empty' values in a Uint32Array index. */
const EMPTY = 2 ** 32 - 1;

const Tolerance = {
	DEFAULT: 0,
	TEXCOORD: 0.0001, // [0, 1]
	COLOR: 0.01, // [0, 1]
	NORMAL: 0.05, // [-1, 1], ±3º
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
	/** Enables a more thorough, but slower, search for vertices to weld. */
	exhaustive?: boolean;
}

export const WELD_DEFAULTS: Required<WeldOptions> = {
	tolerance: Tolerance.DEFAULT,
	toleranceNormal: Tolerance.NORMAL,
	overwrite: true,
	exhaustive: false, // donmccurdy/glTF-Transform#886
};

/**
 * TODO(DO NOT SUBMIT): Document new implementation.
 *
 * Index {@link Primitive Primitives} and (optionally) merge similar vertices. When merged
 * and indexed, data is shared more efficiently between vertices. File size can
 * be reduced, and the GPU can sometimes use the vertex cache more efficiently.
 *
 * When welding, the 'tolerance' threshold determines which vertices qualify for
 * welding based on distance between the vertices as a fraction of the primitive's
 * bounding box (AABB). For example, tolerance=0.01 welds vertices within +/-1%
 * of the AABB's longest dimension. Other vertex attributes are also compared
 * during welding, with attribute-specific thresholds. For `tolerance=0`, geometry
 * is indexed in place, without merging.
 *
 * To preserve visual appearance consistently, use low `toleranceNormal` thresholds
 * around 0.1 (±3º). To pre-processing a scene before simplification or LOD creation,
 * use higher thresholds around 0.5 (±30º).
 *
 * Example:
 *
 * ```javascript
 * import { weld } from '@gltf-transform/functions';
 *
 * await document.transform(
 * 	weld({ tolerance: 0.001, toleranceNormal: 0.5 })
 * );
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

		if (options.tolerance > 0) {
			// If tolerance is greater than 0, welding may remove a mesh, so we prune
			await doc.transform(
				prune({
					propertyTypes: [PropertyType.ACCESSOR, PropertyType.NODE],
					keepAttributes: true,
					keepIndices: true,
					keepLeaves: false,
				}),
			);
		}

		await doc.transform(dedup({ propertyTypes: [PropertyType.ACCESSOR] }));

		logger.debug(`${NAME}: Complete.`);
	});
}

/**
 * TODO(DO NOT SUBMIT): Document new implementation.
 *
 * Index a {@link Primitive} and (optionally) weld similar vertices. When merged
 * and indexed, data is shared more efficiently between vertices. File size can
 * be reduced, and the GPU can sometimes use the vertex cache more efficiently.
 *
 * When welding, the 'tolerance' threshold determines which vertices qualify for
 * welding based on distance between the vertices as a fraction of the primitive's
 * bounding box (AABB). For example, tolerance=0.01 welds vertices within +/-1%
 * of the AABB's longest dimension. Other vertex attributes are also compared
 * during welding, with attribute-specific thresholds. For tolerance=0, geometry
 * is indexed in place, without merging.
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
 *   weldPrimitive(prim, {tolerance: 0.0001});
 * }
 * ```
 */
export function weldPrimitive(prim: Primitive, _options: WeldOptions = WELD_DEFAULTS): void {
	const graph = prim.getGraph();
	const document = Document.fromGraph(graph)!;
	const options = expandWeldOptions(_options);

	if (prim.getIndices() && !_options.overwrite) return;
	if (prim.getMode() === Primitive.Mode.POINTS) return;

	if (_options.tolerance === 0) {
		_weldPrimitiveStrict(document, prim);
	} else {
		_weldPrimitive(document, prim, options);
	}
}

/** @internal Weld and merge, combining vertices that are bitwise-equal. */
function _weldPrimitiveStrict(document: Document, prim: Primitive): void {
	const logger = document.getLogger();
	const srcVertexCount = prim.getAttribute('POSITION')!.getCount();
	const srcIndices = prim.getIndices();
	const srcIndicesArray = srcIndices?.getArray();
	const srcIndicesCount = srcIndices ? srcIndices.getCount() : srcVertexCount;

	const hash = new HashTable(prim);
	const tableSize = ceilPowerOfTwo(srcVertexCount + srcVertexCount / 4);
	const table = new Uint32Array(tableSize).fill(EMPTY);
	const writeMap = new Uint32Array(srcVertexCount).fill(EMPTY); // oldIndex → newIndex

	// (1) Compare and identify indices to weld.

	let dstVertexCount = 0;

	for (let i = 0; i < srcIndicesCount; i++) {
		const srcIndex = srcIndicesArray ? srcIndicesArray[i] : i;
		if (writeMap[srcIndex] !== EMPTY) continue;

		const hashIndex = hashLookup(table, tableSize, hash, srcIndex, EMPTY);
		const dstIndex = table[hashIndex];

		if (dstIndex === EMPTY) {
			table[hashIndex] = srcIndex;
			writeMap[srcIndex] = dstVertexCount++;
		} else {
			writeMap[srcIndex] = writeMap[dstIndex];
		}
	}

	logger.debug(`${NAME}: ${formatDeltaOp(srcVertexCount, dstVertexCount)} vertices.`);

	remapPrimitive(prim, writeMap, dstVertexCount);
}

/** @internal Weld and merge, combining vertices within tolerance. */
function _weldPrimitive(document: Document, prim: Primitive, options: Required<WeldOptions>): void {
	const logger = document.getLogger();

	const srcPosition = prim.getAttribute('POSITION')!;
	const srcIndices = prim.getIndices() || document.createAccessor().setArray(createIndices(srcPosition.getCount()));
	const uniqueIndices = new Uint32Array(new Set(srcIndices.getArray()!)).sort();

	// (1) Compute per-attribute tolerance and spatial grid for vertices.

	const attributeTolerance: Record<string, number> = {};
	for (const semantic of prim.listSemantics()) {
		const attribute = prim.getAttribute(semantic)!;
		attributeTolerance[semantic] = getAttributeTolerance(semantic, attribute, options);
	}

	logger.debug(`${NAME}: Tolerance thresholds: ${formatKV(attributeTolerance)}`);

	// (2) Build the lookup grid.

	const posA: vec3 = [0, 0, 0];
	const posB: vec3 = [0, 0, 0];

	const grid = {} as Record<string, number[]>;
	const cellSize = attributeTolerance.POSITION;

	for (let i = 0; i < uniqueIndices.length; i++) {
		srcPosition.getElement(uniqueIndices[i], posA);
		const key = getGridKey(posA, cellSize);
		grid[key] = grid[key] || [];
		grid[key].push(uniqueIndices[i]);
	}

	// (3) Compare and identify vertices to weld.

	const srcMaxIndex = uniqueIndices[uniqueIndices.length - 1];
	const weldMap = createIndices(srcMaxIndex + 1); // oldIndex → oldCommonIndex
	const writeMap = new Uint32Array(uniqueIndices.length).fill(EMPTY); // oldIndex → newIndex

	const srcVertexCount = srcPosition.getCount();
	let dstVertexCount = 0;

	for (let i = 0; i < uniqueIndices.length; i++) {
		const a = uniqueIndices[i];
		srcPosition.getElement(a, posA);

		const cellKeys = options.exhaustive ? getGridNeighborhoodKeys(posA, cellSize) : [getGridKey(posA, cellSize)];

		cells: for (const cellKey of cellKeys) {
			if (!grid[cellKey]) continue cells; // May occur in exhaustive search.

			neighbors: for (const j of grid[cellKey]) {
				const b = weldMap[j];

				// Only weld to lower indices, preventing two-way match.
				if (a <= b) continue neighbors;

				srcPosition.getElement(b, posB);

				// Weld if base attributes and morph target attributes match.
				const isBaseMatch = prim.listSemantics().every((semantic) => {
					const attribute = prim.getAttribute(semantic)!;
					const tolerance = attributeTolerance[semantic];
					return compareAttributes(attribute, a, b, tolerance, semantic);
				});
				const isTargetMatch = prim.listTargets().every((target) => {
					return target.listSemantics().every((semantic) => {
						const attribute = target.getAttribute(semantic)!;
						const tolerance = attributeTolerance[semantic];
						return compareAttributes(attribute, a, b, tolerance, semantic);
					});
				});

				if (isBaseMatch && isTargetMatch) {
					weldMap[a] = b;
					break cells;
				}
			}
		}

		// Output the vertex if we didn't find a match, else record the index of the match. Because
		// we iterate vertices in ascending order, and only match to lower indices, we're
		// guaranteed the source vertex for a weld has already been marked for output.
		if (weldMap[a] === a) {
			writeMap[a] = dstVertexCount++;
		} else {
			writeMap[a] = writeMap[weldMap[a]];
		}
	}

	logger.debug(`${NAME}: ${formatDeltaOp(srcVertexCount, dstVertexCount)} vertices.`);

	remapPrimitive(prim, writeMap, dstVertexCount);
}

const _a = [] as number[];
const _b = [] as number[];

/** Computes a per-attribute tolerance, based on domain and usage of the attribute. */
function getAttributeTolerance(semantic: string, attribute: Accessor, options: Required<WeldOptions>): number {
	// Attributes like NORMAL and COLOR_# do not vary in range like POSITION,
	// so do not apply the given tolerance factor to these attributes.
	if (semantic === 'NORMAL' || semantic === 'TANGENT') return options.toleranceNormal;
	if (semantic.startsWith('COLOR_')) return Tolerance.COLOR;
	if (semantic.startsWith('TEXCOORD_')) return Tolerance.TEXCOORD;
	if (semantic.startsWith('JOINTS_')) return Tolerance.JOINTS;
	if (semantic.startsWith('WEIGHTS_')) return Tolerance.WEIGHTS;

	_a.length = _b.length = 0;
	attribute.getMinNormalized(_a);
	attribute.getMaxNormalized(_b);
	const diff = _b.map((bi, i) => bi - _a[i]);
	const range = Math.max(...diff);
	return options.tolerance * range;
}

/** Compares two vertex attributes against a tolerance threshold. */
function compareAttributes(attribute: Accessor, a: number, b: number, tolerance: number, _semantic: string): boolean {
	attribute.getElement(a, _a);
	attribute.getElement(b, _b);
	for (let i = 0, il = attribute.getElementSize(); i < il; i++) {
		if (Math.abs(_a[i] - _b[i]) > tolerance) {
			return false;
		}
	}
	return true;
}

function formatKV(kv: Record<string, unknown>): string {
	return Object.entries(kv)
		.map(([k, v]) => `${k}=${v}`)
		.join(', ');
}

// Order to search nearer cells first.
const CELL_OFFSETS = [0, -1, 1];

function getGridNeighborhoodKeys(p: vec3, cellSize: number): string[] {
	const keys = [] as string[];
	const _p = [0, 0, 0] as vec3;
	for (const i of CELL_OFFSETS) {
		for (const j of CELL_OFFSETS) {
			for (const k of CELL_OFFSETS) {
				_p[0] = p[0] + i * cellSize;
				_p[1] = p[1] + j * cellSize;
				_p[2] = p[2] + k * cellSize;
				keys.push(getGridKey(_p, cellSize));
			}
		}
	}
	return keys;
}

function getGridKey(p: vec3, cellSize: number): string {
	const cellX = Math.round(p[0] / cellSize);
	const cellY = Math.round(p[1] / cellSize);
	const cellZ = Math.round(p[2] / cellSize);
	return cellX + ':' + cellY + ':' + cellZ;
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

/******************************************************************************
 * MURMUR HASH
 */

class HashTable {
	private attributes: { u8: Uint8Array; byteStride: number; paddedByteStride: number }[] = [];

	/** Temporary vertex view in 4-byte-aligned memory. */
	private u8: Uint8Array;

	constructor(prim: Primitive) {
		let byteStride = 0;
		for (const attribute of deepListAttributes(prim)) {
			byteStride += this._initAttribute(attribute);
		}
		this.u8 = new Uint8Array(byteStride);
	}

	private _initAttribute(attribute: Accessor): number {
		const array = attribute.getArray()!;
		const u8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
		const byteStride = attribute.getElementSize() * attribute.getComponentSize();
		const paddedByteStride = BufferUtils.padNumber(byteStride);
		this.attributes.push({ u8, byteStride, paddedByteStride });
		return paddedByteStride;
	}

	hash(index: number): number {
		// Load vertex into 4-byte-aligned view.
		for (const { u8, byteStride, paddedByteStride } of this.attributes) {
			for (let i = 0; i < paddedByteStride; i++) {
				this.u8[i] = i < byteStride ? u8[index * byteStride + i] : 0;
			}
		}

		// Compute hash.
		return murmurHash2(0, this.u8);
	}

	equal(a: number, b: number): boolean {
		for (const { u8, byteStride } of this.attributes) {
			for (let j = 0; j < byteStride; j++) {
				if (u8[a * byteStride + j] !== u8[b * byteStride + j]) {
					return false;
				}
			}
		}
		return true;
	}
}

/**
 * References:
 * - https://github.com/mikolalysenko/murmurhash-js/blob/f19136e9f9c17f8cddc216ca3d44ec7c5c502f60/murmurhash2_gc.js#L14
 * - https://github.com/zeux/meshoptimizer/blob/e47e1be6d3d9513153188216455bdbed40a206ef/src/indexgenerator.cpp#L12
 */
function murmurHash2(seed: number, data: Uint8Array) {
	let l = data.length,
		h = seed ^ l,
		i = 0,
		k;

	while (l >= 4) {
		k = (data[i] & 0xff) | ((data[++i] & 0xff) << 8) | ((data[++i] & 0xff) << 16) | ((data[++i] & 0xff) << 24);

		k = (k & 0xffff) * 0x5bd1e995 + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16);
		k ^= k >>> 24;
		k = (k & 0xffff) * 0x5bd1e995 + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16);

		h = ((h & 0xffff) * 0x5bd1e995 + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16)) ^ k;

		l -= 4;
		++i;
	}

	if (l === 3) h ^= (data[i + 2] & 0xff) << 16;
	if (l >= 2) h ^= (data[i + 1] & 0xff) << 8;
	if (l >= 1) h ^= data[i] & 0xff;
	h = (h & 0xffff) * 0x5bd1e995 + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16);

	h ^= h >>> 13;
	h = (h & 0xffff) * 0x5bd1e995 + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16);
	h ^= h >>> 15;

	return h >>> 0;
}

function hashLookup(table: Uint32Array, buckets: number, hash: HashTable, key: number, empty = EMPTY): number {
	const hashmod = buckets - 1;
	const hashval = hash.hash(key);
	let bucket = hashval & hashmod;

	for (let probe = 0; probe <= hashmod; probe++) {
		const item = table[bucket];

		if (item === empty || hash.equal(item, key)) {
			return bucket;
		}

		bucket = (bucket + probe + 1) & hashmod; // Hash collision.
	}

	throw new Error('Hash table full.');
}
