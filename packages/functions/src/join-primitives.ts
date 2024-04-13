import { Document, Primitive, ComponentTypeToTypedArray } from '@gltf-transform/core';
import { createIndices, createPrimGroupKey, shallowCloneAccessor } from './utils.js';
import { convertPrimitiveToLines, convertPrimitiveToTriangles } from './convert-primitive-mode.js';
import { remapIndices, remapAttribute } from './remap-primitive.js';

interface JoinPrimitiveOptions {
	skipValidation?: boolean;
}

const JOIN_PRIMITIVE_DEFAULTS: Required<JoinPrimitiveOptions> = {
	skipValidation: false,
};

const EMPTY_U32 = 2 ** 32 - 1;

const { LINE_STRIP, LINE_LOOP, TRIANGLE_STRIP, TRIANGLE_FAN } = Primitive.Mode;

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
				'Requires >=2 Primitives, sharing the same Material ' +
				'and Mode, with compatible vertex attributes and indices.',
		);
	}

	// (2) Convert all prims to POINTS, LINES, or TRIANGLES.
	for (const prim of prims) {
		switch (prim.getMode()) {
			case LINE_STRIP:
			case LINE_LOOP:
				convertPrimitiveToLines(prim);
				break;
			case TRIANGLE_STRIP:
			case TRIANGLE_FAN:
				convertPrimitiveToTriangles(prim);
				break;
		}
	}

	const primRemaps = [] as Uint32Array[]; // remap[srcIndex] → dstIndex, by prim
	const primVertexCounts = new Uint32Array(prims.length); // vertex count, by prim

	let dstVertexCount = 0;
	let dstIndicesCount = 0;

	// (3) Build remap lists.
	for (let primIndex = 0; primIndex < prims.length; primIndex++) {
		const srcPrim = prims[primIndex];
		const srcIndices = srcPrim.getIndices();
		const srcVertexCount = srcPrim.getAttribute('POSITION')!.getCount();
		const srcIndicesArray = srcIndices ? srcIndices.getArray() : null;
		const srcIndicesCount = srcIndices ? srcIndices.getCount() : srcVertexCount;

		const remap = new Uint32Array(getIndicesMax(srcPrim) + 1).fill(EMPTY_U32);

		for (let i = 0; i < srcIndicesCount; i++) {
			const index = srcIndicesArray ? srcIndicesArray[i] : i;
			if (remap[index] === EMPTY_U32) {
				remap[index] = dstVertexCount++;
				primVertexCounts[primIndex]++;
			}
		}

		primRemaps.push(new Uint32Array(remap));
		dstIndicesCount += srcIndicesCount;
	}

	// (4) Allocate joined attributes.
	const dstPrim = document.createPrimitive().setMode(templatePrim.getMode()).setMaterial(templatePrim.getMaterial());
	for (const semantic of templatePrim.listSemantics()) {
		const tplAttribute = templatePrim.getAttribute(semantic)!;
		const AttributeArray = ComponentTypeToTypedArray[tplAttribute.getComponentType()];
		const dstAttribute = shallowCloneAccessor(document, tplAttribute).setArray(
			new AttributeArray(dstVertexCount * tplAttribute.getElementSize()),
		);
		dstPrim.setAttribute(semantic, dstAttribute);
	}

	// (5) Allocate joined indices.
	const srcIndices = templatePrim.getIndices();
	const dstIndices = srcIndices
		? shallowCloneAccessor(document, srcIndices).setArray(createIndices(dstIndicesCount, dstVertexCount))
		: null;
	dstPrim.setIndices(dstIndices);

	// (6) Remap attributes into joined Primitive.
	let dstIndicesOffset = 0;
	for (let primIndex = 0; primIndex < primRemaps.length; primIndex++) {
		const srcPrim = prims[primIndex];
		const srcVertexCount = srcPrim.getAttribute('POSITION')!.getCount();
		const srcIndices = srcPrim.getIndices();
		const srcIndicesCount = srcIndices ? srcIndices.getCount() : -1;

		const remap = primRemaps[primIndex];

		if (srcIndices && dstIndices) {
			remapIndices(srcIndices, remap, dstIndicesOffset, srcIndicesCount, dstIndices);
		}

		for (const semantic of dstPrim.listSemantics()) {
			const srcAttribute = srcPrim.getAttribute(semantic)!;
			const dstAttribute = dstPrim.getAttribute(semantic)!;
			remapAttribute(srcAttribute, remap, srcVertexCount, dstAttribute);
		}

		dstIndicesOffset += srcIndicesCount;
	}

	return dstPrim;
}

function getIndicesMax(prim: Primitive): number {
	const indices = prim.getIndices();
	const position = prim.getAttribute('POSITION')!;
	if (!indices) return position.getCount() - 1;

	const indicesArray = indices.getArray()!;
	const indicesCount = indices.getCount();

	let indicesMax = -1;
	for (let i = 0; i < indicesCount; i++) {
		indicesMax = Math.max(indicesMax, indicesArray[i]);
	}
	return indicesMax;
}
