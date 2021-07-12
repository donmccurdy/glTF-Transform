import { Accessor, Document, Primitive, PrimitiveTarget, Transform, TypedArray } from '@gltf-transform/core';
import { getGLPrimitiveCount } from './utils';

const NAME = 'weld';

/** Options for the {@link weld} function. */
export interface WeldOptions {
	/** Per-attribute tolerance used when merging similar vertices. */
	tolerance?: number
}

const WELD_DEFAULTS: Required<WeldOptions> = {tolerance: 1e-4};

/**
 * Index {@link Primitive}s and (optionally) merge similar vertices.
 */
export function weld (_options: WeldOptions = WELD_DEFAULTS): Transform {
	const options = {...WELD_DEFAULTS, ..._options} as Required<WeldOptions>;

	return (doc: Document): void => {
		const logger = doc.getLogger();

		for (const mesh of doc.getRoot().listMeshes()) {
			for (const prim of mesh.listPrimitives()) {
				if (options.tolerance === 0) {
					weldOnly(doc, prim);
				} else {
					weldAndMerge(doc, prim, options);
				}
			}
		}

		logger.debug(`${NAME}: Complete.`);
	};
}

/**  In-place weld, adds indices without changing number of vertices. */
function weldOnly (doc: Document, prim: Primitive): void {
	if (prim.getIndices()) return;
	const attr = prim.listAttributes()[0];
	const numVertices = attr.getCount();
	const buffer = attr.getBuffer();
	const indicesArray = numVertices <= 65534
		? new Uint16Array(getGLPrimitiveCount(prim) * 3)
		: new Uint32Array(getGLPrimitiveCount(prim) * 3);
	const indices = doc.createAccessor()
		.setBuffer(buffer)
		.setType(Accessor.Type.SCALAR)
		.setArray(indicesArray);
	for (let i = 0; i < indices.getCount(); i++) indices.setScalar(i, i);
	prim.setIndices(indices);
}

/**
 * Weld and merge, combining vertices that are similar on all vertex attributes. Morph target
 * attributes are not considered when scoring vertex similarity, but are retained when merging.
 */
function weldAndMerge (doc: Document, prim: Primitive, options: Required<WeldOptions>): void {
	const tolerance = Math.max(options.tolerance, Number.EPSILON);
	const decimalShift = Math.log10(1 / tolerance);
	const shiftFactor = Math.pow(10, decimalShift);

	const hashToIndex: {[key: string]: number} = {};
	const srcIndices = prim.getIndices();
	const vertexCount = srcIndices
		? srcIndices.getCount()
		: prim.listAttributes()[0].getCount();

	// Prepare storage for new elements of each attribute.
	const dstAttributes = new Map<Accessor, number[][]>();
	prim.listAttributes().forEach((attr) => dstAttributes.set(attr, []));
	prim.listTargets().forEach((target) => {
		target.listAttributes().forEach((attr) => dstAttributes.set(attr, []));
	});

	const dstIndicesArray = [];
	let nextIndex = 0;

	// For each vertex, compute a hash based on its tolerance and merge with any sufficiently
	// similar vertices.
	for (let i = 0; i < vertexCount; i++) {
		const index = srcIndices ? srcIndices.getScalar(i) : i;

		const hashElements: number[] = [];
		const el: number[] = [];
		for (const attribute of prim.listAttributes()) {
			for (let j = 0; j < attribute.getElementSize(); j++) {
				hashElements.push(~ ~ (attribute.getElement(index, el)[j] * shiftFactor));
			}
		}

		const hash = hashElements.join('|');
		if (hash in hashToIndex) {
			dstIndicesArray.push(hashToIndex[hash]);
		} else {
			for (const attr of prim.listAttributes()) {
				dstAttributes.get(attr)!.push(attr.getElement(index, []));
			}
			for (const target of prim.listTargets()) {
				for (const attr of target.listAttributes()) {
					dstAttributes.get(attr)!.push(attr.getElement(index, []));
				}
			}

			hashToIndex[hash] = nextIndex;
			dstIndicesArray.push(nextIndex);
			nextIndex++;
		}
	}

	const srcVertexCount = prim.listAttributes()[0].getCount();
	const dstVertexCount = dstAttributes.get(prim.getAttribute('POSITION')!)!.length;
	doc.getLogger().debug(`${NAME}: ${srcVertexCount} → ${dstVertexCount} vertices.`);

	// Update the primitive.
	for (const srcAttr of prim.listAttributes()) {
		swapAttributes(prim, srcAttr, dstAttributes.get(srcAttr)!);

		// Clean up.
		if (srcAttr.listParents().length === 1) srcAttr.dispose();
	}
	for (const target of prim.listTargets()) {
		for (const srcAttr of target.listAttributes()) {
			swapAttributes(target, srcAttr, dstAttributes.get(srcAttr)!);

			// Clean up.
			if (srcAttr.listParents().length === 1) srcAttr.dispose();
		}
	}
	if (srcIndices) {
		const dstIndicesTypedArray
			= createArrayOfType(srcIndices.getArray()!, dstIndicesArray.length);
		dstIndicesTypedArray.set(dstIndicesArray);
		prim.setIndices(srcIndices.clone().setArray(dstIndicesTypedArray));

		// Clean up.
		if (srcIndices.listParents().length === 1) srcIndices.dispose();
	} else {
		const indicesArray = srcVertexCount <= 65534
			? new Uint16Array(dstIndicesArray)
			: new Uint32Array(dstIndicesArray);
		prim.setIndices(doc.createAccessor().setArray(indicesArray));
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
		dstAttrElements: number[][]): void {
	const dstAttrArrayLength = dstAttrElements.length * srcAttr.getElementSize();
	const dstAttrArray = createArrayOfType(srcAttr.getArray()!, dstAttrArrayLength);
	const dstAttr = srcAttr.clone().setArray(dstAttrArray);

	for (let i = 0; i < dstAttrElements.length; i++) {
		dstAttr.setElement(i, dstAttrElements[i]);
	}

	parent.swap(srcAttr, dstAttr);
}
