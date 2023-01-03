import {
	Accessor,
	Document,
	Primitive,
	PrimitiveTarget,
	PropertyType,
	Transform,
	TransformContext,
	TypedArray,
	vec3,
} from '@gltf-transform/core';
import { dedup } from './dedup';
import { createIndices, createTransform, formatDeltaOp, isTransformPending } from './utils';

const NAME = 'weld';

const Tolerance = {
	DEFAULT: 0.0001,
	TEXCOORD: 0.0001, // [0, 1]
	COLOR: 0.01, // [0, 1]
	NORMAL: 0.5, // [-1, 1]
	JOINTS: 0.0, // [0, ∞]
	WEIGHTS: 0.01, // [0, ∞]
};

/** Options for the {@link weld} function. */
export interface WeldOptions {
	/** Tolerance, as a fraction of primitive AABB, used when merging similar vertices. */
	tolerance?: number;
	/** Whether to overwrite existing indices. */
	overwrite?: boolean;
}

export const WELD_DEFAULTS: Required<WeldOptions> = {
	tolerance: Tolerance.DEFAULT,
	overwrite: true,
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
 * during welding, with attribute-specific thresholds. For --tolerance=0, geometry
 * is indexed in place, without merging.
 *
 * Example:
 *
 * ```javascript
 * import { weld } from '@gltf-transform/functions';
 *
 * await document.transform(
 * 	weld({ tolerance: 0.001 })
 * );
 * ```
 */
export function weld(_options: WeldOptions = WELD_DEFAULTS): Transform {
	const options = { ...WELD_DEFAULTS, ..._options } as Required<WeldOptions>;

	if (options.tolerance > 0.1 || options.tolerance < 0) {
		throw new Error(`${NAME}: Requires 0 ≤ tolerance ≤ 0.1`);
	}

	return createTransform(NAME, async (doc: Document, context?: TransformContext): Promise<void> => {
		const logger = doc.getLogger();

		for (const mesh of doc.getRoot().listMeshes()) {
			for (const prim of mesh.listPrimitives()) {
				weldPrimitive(doc, prim, options);
			}
		}

		// TODO(perf): Suppose we just invoked simplify(), and dedup is not explicitly
		// in the transform stack .... now we are going to run it twice!
		if (!isTransformPending(context, NAME, 'dedup')) {
			await doc.transform(dedup({ propertyTypes: [PropertyType.ACCESSOR] }));
		}

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
 * during welding, with attribute-specific thresholds. For --tolerance=0, geometry
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
 *   weldPrimitive(document, prim, {tolerance: 0.0001});
 * }
 * ```
 */
export function weldPrimitive(doc: Document, prim: Primitive, options: Required<WeldOptions>): void {
	if (prim.getIndices() && !options.overwrite) return;
	if (prim.getMode() === Primitive.Mode.POINTS) return;
	if (options.tolerance === 0) {
		_indexPrimitive(doc, prim);
	} else {
		_weldPrimitive(doc, prim, options);
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
	const uniqueIndices = new Uint32Array(new Set(srcIndices.getArray()!));

	// (1) Compute per-attribute tolerances, pre-sort vertices.

	const tolerance = Math.max(options.tolerance, Number.EPSILON);
	const attributeTolerance: Record<string, number> = {};
	for (const semantic of prim.listSemantics()) {
		const attribute = prim.getAttribute(semantic)!;
		attributeTolerance[semantic] = getAttributeTolerance(semantic, attribute, tolerance);
	}

	logger.debug(`${NAME}: Tolerance thresholds: ${formatKV(attributeTolerance)}`);

	const posA: vec3 = [0, 0, 0];
	const posB: vec3 = [0, 0, 0];

	uniqueIndices.sort((a, b) => {
		srcPosition.getElement(a, posA);
		srcPosition.getElement(b, posB);
		return posA[0] > posB[0] ? 1 : -1;
	});

	// (2) Compare and identify vertices to weld. Use sort to keep iterations below O(n²),

	const weldMap = createIndices(uniqueIndices.length); // oldIndex → oldCommonIndex
	const writeMap = createIndices(uniqueIndices.length); // oldIndex → newIndex

	const srcVertexCount = srcPosition.getCount();
	let dstVertexCount = 0;
	let backIters = 0;

	for (let i = 0; i < uniqueIndices.length; i++) {
		const a = uniqueIndices[i];

		for (let j = i - 1; j >= 0; j--) {
			const b = weldMap[uniqueIndices[j]];

			srcPosition.getElement(a, posA);
			srcPosition.getElement(b, posB);

			// Sort order allows early exit on X-axis distance.
			if (Math.abs(posA[0] - posB[0]) > attributeTolerance['POSITION']) {
				break;
			}

			backIters++;

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
				break;
			}
		}

		// Output the vertex if we didn't find a match, else record the index of the match.
		if (weldMap[a] === a) {
			writeMap[a] = dstVertexCount++; // note: reorders the primitive on x-axis sort.
		} else {
			writeMap[a] = writeMap[weldMap[a]];
		}
	}

	logger.debug(`${NAME}: Iterations per vertex: ${Math.round(backIters / uniqueIndices.length)} (avg)`);
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
	reorder: Uint32Array | Uint16Array,
	dstCount: number
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
function getAttributeTolerance(semantic: string, attribute: Accessor, tolerance: number): number {
	// Attributes like NORMAL and COLOR_# do not vary in range like POSITION,
	// so do not apply the given tolerance factor to these attributes.
	if (semantic === 'NORMAL' || semantic === 'TANGENT') return Tolerance.NORMAL;
	if (semantic.startsWith('COLOR_')) return Tolerance.COLOR;
	if (semantic.startsWith('TEXCOORD_')) return Tolerance.TEXCOORD;
	if (semantic.startsWith('JOINTS_')) return Tolerance.JOINTS;
	if (semantic.startsWith('WEIGHTS_')) return Tolerance.WEIGHTS;

	_a.length = _b.length = 0;
	attribute.getMinNormalized(_a);
	attribute.getMaxNormalized(_b);
	const range = Math.max(..._b) - Math.min(..._a) || 1;
	return tolerance * range;
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
