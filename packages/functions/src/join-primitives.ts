import { Document, Primitive, ComponentTypeToTypedArray } from '@gltf-transform/core';
import { createIndices, createPrimGroupKey } from './utils.js';

interface JoinPrimitiveOptions {
	skipValidation?: boolean;
}

const JOIN_PRIMITIVE_DEFAULTS: Required<JoinPrimitiveOptions> = {
	skipValidation: false,
};

/**
 * Given a list of compatible Mesh {@link Primitive Primitives}, returns new Primitive
 * containing their vertex data. Compatibility requires that all Primitives share the
 * same {@link Material Materials}, draw mode, and vertex attribute types. Primitives
 * using morph targets cannot currently be joined.
 *
 * Example:
 *
 * ```javascript
 * import { joinPrimitives } from '@gltf-transform/functions';
 *
 * // Succeeds if Primitives are compatible, or throws an error.
 * const result = joinPrimitives(mesh.listPrimitives());
 *
 * for (const prim of mesh.listPrimitives()) {
 * 	prim.dispose();
 * }
 *
 * mesh.addPrimitive(result);
 * ```
 */
export function joinPrimitives(prims: Primitive[], options: JoinPrimitiveOptions = {}): Primitive {
	options = { ...JOIN_PRIMITIVE_DEFAULTS, ...options };
	const templatePrim = prims[0]!;
	const document = Document.fromGraph(templatePrim.getGraph())!;

	// (1) Validation.
	if (!options.skipValidation && new Set(prims.map(createPrimGroupKey)).size > 1) {
		throw new Error(
			'' +
				'Requires ≥2 Primitives, sharing the same Material ' +
				'and Mode, with compatible vertex attributes and indices.'
		);
	}

	const remapList = [] as Uint32Array[]; // remap[srcIndex] → dstIndex, by prim
	const countList = [] as number[]; // vertex count, by prim
	const indicesList = [] as (Uint32Array | Uint16Array)[]; // indices, by prim

	let dstVertexCount = 0;
	let dstIndicesCount = 0;

	// (2) Build remap lists.
	for (const srcPrim of prims) {
		const indices = _getOrCreateIndices(srcPrim);
		const remap = [];
		let count = 0;
		for (let i = 0; i < indices.length; i++) {
			const index = indices[i];
			if (remap[index] === undefined) {
				remap[index] = dstVertexCount++;
				count++;
			}
			dstIndicesCount++;
		}
		remapList.push(new Uint32Array(remap));
		countList.push(count);
		indicesList.push(indices);
	}

	// (3) Allocate joined attributes.
	const dstPrim = document.createPrimitive().setMode(templatePrim.getMode()).setMaterial(templatePrim.getMaterial());
	for (const semantic of templatePrim.listSemantics()) {
		const tplAttribute = templatePrim.getAttribute(semantic)!;
		const AttributeArray = ComponentTypeToTypedArray[tplAttribute.getComponentType()];
		const dstAttribute = document
			.createAccessor()
			.setType(tplAttribute.getType())
			.setBuffer(tplAttribute.getBuffer())
			.setNormalized(tplAttribute.getNormalized())
			.setArray(new AttributeArray(dstVertexCount * tplAttribute.getElementSize()));
		dstPrim.setAttribute(semantic, dstAttribute);
	}

	// (4) Allocate joined indices.
	const dstIndicesArray = templatePrim.getIndices() ? createIndices(dstVertexCount) : null;
	const dstIndices =
		dstIndicesArray &&
		document
			.createAccessor()
			.setBuffer(templatePrim.getIndices()!.getBuffer())
			.setArray(createIndices(dstIndicesCount, dstVertexCount));
	dstPrim.setIndices(dstIndices);

	// (5) Remap attributes into joined Primitive.
	let dstNextIndex = 0;
	for (let primIndex = 0; primIndex < remapList.length; primIndex++) {
		const srcPrim = prims[primIndex];
		const remap = remapList[primIndex];
		const indicesArray = indicesList[primIndex];

		const primStartIndex = dstNextIndex;
		let primNextIndex = primStartIndex;

		for (const semantic of dstPrim.listSemantics()) {
			const srcAttribute = srcPrim.getAttribute(semantic)!;
			const dstAttribute = dstPrim.getAttribute(semantic)!;
			const el = [] as number[];

			primNextIndex = primStartIndex;
			for (let i = 0; i < indicesArray.length; i++) {
				const index = indicesArray[i];
				srcAttribute.getElement(index, el);
				dstAttribute.setElement(remap[index], el);
				if (dstIndices) {
					dstIndices.setScalar(primNextIndex++, remap[index]);
				}
			}
		}

		dstNextIndex = primNextIndex;
	}

	return dstPrim;
}

function _getOrCreateIndices(prim: Primitive): Uint16Array | Uint32Array {
	const indices = prim.getIndices();
	if (indices) return indices.getArray() as Uint32Array | Uint16Array;
	const position = prim.getAttribute('POSITION')!;
	return createIndices(position.getCount());
}
