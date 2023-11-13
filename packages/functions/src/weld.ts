import {
	Accessor,
	Document,
	Primitive,
	PrimitiveTarget,
	PropertyType,
	Transform,
	TypedArray,
	vec3,
} from '@gltf-transform/core';
import { cleanPrimitive } from './clean-primitive.js';
import { dedup } from './dedup.js';
import { prune } from './prune.js';
import { createIndices, createTransform, formatDeltaOp } from './utils.js';

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
// RESULTS: For the "Lovecraftian" sample model, after joining, a primitive
// with 873,000 vertices can be welded down to 230,000 vertices. Results:
// - (1) Not tested, but prior results suggest not robust enough.
// - (2) 30 seconds
// - (3) 660 seconds
// - (4) 5 seconds exhaustive, 1.5s non-exhaustive

const NAME = 'weld';

const Tolerance = {
	DEFAULT: 0.0001,
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
				weldPrimitive(doc, prim, options);

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
 *
 * @privateRemarks TODO(v4): Remove the "Document" parameter.
 */
export function weldPrimitive(
	a: Document | Primitive,
	b: Primitive | WeldOptions = WELD_DEFAULTS,
	c = WELD_DEFAULTS,
): void {
	let _document: Document;
	let _prim: Primitive;
	let _options: Required<WeldOptions>;
	if (a instanceof Primitive) {
		const graph = a.getGraph();
		_document = Document.fromGraph(graph)!;
		_prim = a;
		_options = expandWeldOptions(b as WeldOptions);
	} else {
		_document = a;
		_prim = b as Primitive;
		_options = expandWeldOptions(c as WeldOptions);
	}

	if (_prim.getIndices() && !_options.overwrite) return;
	if (_prim.getMode() === Primitive.Mode.POINTS) return;

	if (_options.tolerance === 0) {
		_indexPrimitive(_document, _prim);
	} else {
		_weldPrimitive(_document, _prim, _options);
	}
}

/** @internal Adds indices, if missing. Does not merge vertices. */
function _indexPrimitive(doc: Document, prim: Primitive): void {
	// No need to overwrite here, even if options.overwrite=true.
	if (prim.getIndices()) return;

	const attr = prim.listAttributes()[0];
	const numVertices = attr.getCount();
	const buffer = attr.getBuffer();
	const indices = doc
		.createAccessor()
		.setBuffer(buffer)
		.setType(Accessor.Type.SCALAR)
		.setArray(createIndices(numVertices));
	prim.setIndices(indices);
}

/** @internal Weld and merge, combining vertices that are similar on all vertex attributes. */
function _weldPrimitive(doc: Document, prim: Primitive, options: Required<WeldOptions>): void {
	const logger = doc.getLogger();

	const srcPosition = prim.getAttribute('POSITION')!;
	const srcIndices = prim.getIndices() || doc.createAccessor().setArray(createIndices(srcPosition.getCount()));
	const uniqueIndices = new Uint32Array(new Set(srcIndices.getArray()!)).sort();

	// (1) Compute per-attribute tolerance and spatial grid for vertices.

	const attributeTolerance: Record<string, number> = {};
	for (const semantic of prim.listSemantics()) {
		const attribute = prim.getAttribute(semantic)!;
		attributeTolerance[semantic] = getAttributeTolerance(semantic, attribute, options);
	}

	logger.debug(`${NAME}: Tolerance thresholds: ${formatKV(attributeTolerance)}`);

	// (2) Compare and identify vertices to weld.

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

	// (2) Compare and identify vertices to weld.

	const srcMaxIndex = uniqueIndices[uniqueIndices.length - 1];
	const weldMap = createIndices(srcMaxIndex + 1); // oldIndex → oldCommonIndex
	const writeMap = new Array(uniqueIndices.length).fill(-1); // oldIndex → newIndex

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

	// (3) Update indices.

	const dstIndicesCount = srcIndices.getCount(); // # primitives does not change.
	const dstIndicesArray = createIndices(dstIndicesCount, uniqueIndices.length);
	for (let i = 0; i < dstIndicesCount; i++) {
		dstIndicesArray[i] = writeMap[srcIndices.getScalar(i)];
	}
	prim.setIndices(srcIndices.clone().setArray(dstIndicesArray));
	if (srcIndices.listParents().length === 1) srcIndices.dispose();

	// (4) Update vertex attributes.

	for (const srcAttr of prim.listAttributes()) {
		swapAttributes(prim, srcAttr, writeMap, dstVertexCount);
	}
	for (const target of prim.listTargets()) {
		for (const srcAttr of target.listAttributes()) {
			swapAttributes(target, srcAttr, writeMap, dstVertexCount);
		}
	}

	// (5) Clean up degenerate triangles.

	cleanPrimitive(prim);
}

/** Creates a new TypedArray of the same type as an original, with a new length. */
function createArrayOfType<T extends TypedArray>(array: T, length: number): T {
	const ArrayCtor = array.constructor as new (length: number) => T;
	return new ArrayCtor(length);
}

/** Replaces an {@link Attribute}, creating a new one with the given elements. */
function swapAttributes(
	parent: Primitive | PrimitiveTarget,
	srcAttr: Accessor,
	reorder: number[],
	dstCount: number,
): void {
	const dstAttrArray = createArrayOfType(srcAttr.getArray()!, dstCount * srcAttr.getElementSize());
	const dstAttr = srcAttr.clone().setArray(dstAttrArray);
	const done = new Uint8Array(dstCount);

	for (let i = 0, el = [] as number[]; i < reorder.length; i++) {
		if (!done[reorder[i]]) {
			dstAttr.setElement(reorder[i], srcAttr.getElement(i, el));
			done[reorder[i]] = 1;
		}
	}

	parent.swap(srcAttr, dstAttr);

	// Clean up.
	if (srcAttr.listParents().length === 1) srcAttr.dispose();
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
