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

/** Options for the {@link weld} function. */
export interface WeldOptions {
	/** Per-attribute tolerance used when merging similar vertices. */
	tolerance?: number;
	/** Whether to overwrite existing indices. */
	overwrite?: boolean;
}

const WELD_DEFAULTS: Required<WeldOptions> = { tolerance: 1e-4, overwrite: true };

const KEEP = Math.pow(2, 32) - 1;

/**
 * Index {@link Primitive}s and (optionally) merge similar vertices.
 */
export function weld(_options: WeldOptions = WELD_DEFAULTS): Transform {
	const options = { ...WELD_DEFAULTS, ..._options } as Required<WeldOptions>;

	return createTransform(NAME, async (doc: Document, context?: TransformContext): Promise<void> => {
		const logger = doc.getLogger();

		for (const mesh of doc.getRoot().listMeshes()) {
			for (const prim of mesh.listPrimitives()) {
				if (prim.getIndices() && !options.overwrite) {
					continue;
				} else if (prim.getMode() === Primitive.Mode.POINTS) {
					continue;
				} else if (options.tolerance === 0) {
					weldOnly(doc, prim);
				} else {
					weldAndMerge(doc, prim, options);
				}
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

/**  In-place weld, adds indices without changing number of vertices. */
function weldOnly(doc: Document, prim: Primitive): void {
	if (prim.getIndices()) return;
	const attr = prim.listAttributes()[0];
	const numVertices = attr.getCount();
	const buffer = attr.getBuffer();
	const indicesArray = numVertices <= 65534 ? new Uint16Array(numVertices) : new Uint32Array(numVertices);
	const indices = doc.createAccessor().setBuffer(buffer).setType(Accessor.Type.SCALAR).setArray(indicesArray);
	for (let i = 0; i < indices.getCount(); i++) indices.setScalar(i, i);
	prim.setIndices(indices);
}

/**
 * Weld and merge, combining vertices that are similar on all vertex attributes. Morph target
 * attributes are not considered when scoring vertex similarity, but are retained when merging.
 */
function weldAndMerge(doc: Document, prim: Primitive, options: Required<WeldOptions>): void {
	const logger = doc.getLogger();

	const srcPosition = prim.getAttribute('POSITION')!;
	const srcIndices = prim.getIndices();
	const uniqueIndicesArray = srcIndices
		? new Uint32Array(new Set(srcIndices.getArray()!))
		: createIndices(srcPosition.getCount());

	// (1) Compute per-attribute tolerances, pre-sort vertices.

	const tolerance = Math.max(options.tolerance, Number.EPSILON);
	const attributeTolerance: Record<string, number> = {};
	for (const semantic of prim.listSemantics()) {
		attributeTolerance[semantic] = getAttributeTolerance(semantic, prim.getAttribute(semantic)!, tolerance);
	}

	const posA: vec3 = [0, 0, 0];
	const posB: vec3 = [0, 0, 0];

	uniqueIndicesArray.sort((a, b) => {
		srcPosition.getElement(a, posA);
		srcPosition.getElement(b, posB);
		return posA[0] > posB[0] ? 1 : -1; // TODO(test): if this order is reversed...
	});

	console.log({ sorted: uniqueIndicesArray }); // TODO(cleanup)

	// (2) Compare and identify vertices to weld. Use sort to keep iterations below O(n²),

	const reorder = new Uint32Array(uniqueIndicesArray.length).fill(KEEP);
	let weldCount = 0;

	for (let i = 0; i < uniqueIndicesArray.length; i++) {
		const a = uniqueIndicesArray[i];
		for (let j = i - 1; j >= 0; j--) {
			let b = uniqueIndicesArray[j];
			if (reorder[b] < KEEP) b = reorder[b];

			srcPosition.getElement(a, posA);
			srcPosition.getElement(b, posB);

			// Sort order allows early exit on X-axis distance.
			if (posA[0] < posB[0] - attributeTolerance['POSITION']) {
				break;
			}

			// Weld if base attributes and morph target attributes match.
			const isBaseMatch = prim.listSemantics().every((semantic) => {
				const attribute = prim.getAttribute(semantic)!;
				const tolerance = attributeTolerance[semantic];
				return compareAttributes(attribute, a, b, tolerance);
			});
			const isTargetMatch = prim.listTargets().every((target) => {
				return target.listSemantics().every((semantic) => {
					const attribute = prim.getAttribute(semantic)!;
					const tolerance = attributeTolerance[semantic];
					return compareAttributes(attribute, a, b, tolerance);
				});
			});
			if (isBaseMatch && isTargetMatch) {
				reorder[a] = b;
				weldCount++;
			}
		}
	}

	const srcVertexCount = srcPosition.getCount();
	const dstVertexCount = srcVertexCount - weldCount;
	logger.debug(`${NAME}: ${formatDeltaOp(srcVertexCount, dstVertexCount)} vertices.`);

	// (3) Update indices.

	const dstIndicesCount = srcIndices ? srcIndices.getCount() : srcVertexCount * 3;
	const dstIndicesArray = createIndices(dstIndicesCount);
	for (let i = 0; i < dstIndicesCount; i++) {
		const srcIndex = srcIndices ? srcIndices.getScalar(i) : i;
		dstIndicesArray[i] = reorder[srcIndex];
	}
	if (srcIndices) {
		prim.setIndices(srcIndices.clone().setArray(dstIndicesArray));
		if (srcIndices.listParents().length === 1) srcIndices.dispose();
	} else {
		prim.setIndices(doc.createAccessor().setArray(dstIndicesArray));
	}

	// (4) Update vertex attributes.

	for (const srcAttr of prim.listAttributes()) {
		swapAttributes(prim, srcAttr, reorder, dstVertexCount);
	}
	for (const target of prim.listTargets()) {
		for (const srcAttr of target.listAttributes()) {
			swapAttributes(target, srcAttr, reorder, dstVertexCount);
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
	reorder: Uint32Array,
	dstCount: number
): void {
	const dstAttrArray = createArrayOfType(srcAttr.getArray()!, dstCount * srcAttr.getElementSize());
	const dstAttr = srcAttr.clone().setArray(dstAttrArray);

	for (let i = 0, j = 0, el = [] as number[]; i < reorder.length; i++) {
		if (reorder[i] === KEEP) {
			dstAttr.setElement(j++, srcAttr.getElement(i, el));
		}
	}

	parent.swap(srcAttr, dstAttr);

	// Clean up.
	if (srcAttr.listParents().length === 1) srcAttr.dispose();
}

const BASE_TOLERANCE = 0.0001;
const BASE_TOLERANCE_TEXCOORD = 0.0001; // [0, 1]
const BASE_TOLERANCE_COLOR = 1.0; // [0, 256]
const BASE_TOLERANCE_NORMAL = 0.01; // [-1, 1]
const BASE_TOLERANCE_JOINTS = 0.0; // [0, ∞]
const BASE_TOLERANCE_WEIGHTS = 0.01; // [0, ∞]

const _a = [] as number[];
const _b = [] as number[];

/** Computes a per-attribute tolerance, based on domain and usage of the attribute. */
function getAttributeTolerance(semantic: string, attribute: Accessor, toleranceFactor: number): number {
	if (semantic === 'NORMAL' || semantic === 'TANGENT') return BASE_TOLERANCE_NORMAL * toleranceFactor;
	if (semantic.startsWith('COLOR_')) return BASE_TOLERANCE_COLOR * toleranceFactor;
	if (semantic.startsWith('TEXCOORD_')) return BASE_TOLERANCE_TEXCOORD * toleranceFactor;
	if (semantic.startsWith('JOINTS_')) return BASE_TOLERANCE_JOINTS * toleranceFactor;
	if (semantic.startsWith('WEIGHTS_')) return BASE_TOLERANCE_WEIGHTS * toleranceFactor;

	_a.length = _b.length = 0;
	attribute.getMinNormalized(_a);
	attribute.getMaxNormalized(_b);
	const range = Math.max(..._b) - Math.min(..._a) || 1;
	return BASE_TOLERANCE * range * toleranceFactor;
}

/** Compares two vertex attributes against a tolerance threshold. */
function compareAttributes(attribute: Accessor, a: number, b: number, tolerance: number): boolean {
	attribute.getElement(a, _a);
	attribute.getElement(b, _b);
	for (let i = 0, il = attribute.getElementSize(); i < il; i++) {
		if (Math.abs(_a[i] - _b[i]) > tolerance) {
			return false;
		}
	}
	return true;
}
