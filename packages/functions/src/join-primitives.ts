import {
	type Accessor,
	ComponentTypeToTypedArray,
	Document,
	type Primitive,
	type TypedArray,
} from '@gltf-transform/core';
import {
	assignDefaults,
	createIndicesEmpty,
	createPrimGroupKey,
	getPrimitiveRestartIndex,
	isPrimitiveRestartMode,
	shallowCloneAccessor,
} from './utils.js';

interface JoinPrimitiveOptions {
	skipValidation?: boolean;
}

const JOIN_PRIMITIVE_DEFAULTS: Required<JoinPrimitiveOptions> = {
	skipValidation: false,
};

const EMPTY_U32 = 2 ** 32 - 1;

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
export function joinPrimitives(prims: Primitive[], _options: JoinPrimitiveOptions = {}): Primitive {
	const options = assignDefaults(JOIN_PRIMITIVE_DEFAULTS, _options);
	const templatePrim = prims[0]!;
	const document = Document.fromGraph(templatePrim.getGraph())!;

	// (1) Validation.
	if (!options.skipValidation && new Set(prims.map(createPrimGroupKey)).size > 1) {
		throw new Error(
			'Requires >=2 Primitives, sharing the same Material ' +
				'and Mode, with compatible vertex attributes and indices.',
		);
	}

	const primRemaps = [] as Uint32Array<ArrayBuffer>[]; // remap[srcIndex] → dstIndex, by prim

	const isRestartEnabled = isPrimitiveRestartMode(templatePrim.getMode()) && !!templatePrim.getIndices();

	let dstVertexCount = 0;
	let dstIndicesCount = 0;

	// (3) Build remap lists.
	for (let primIndex = 0; primIndex < prims.length; primIndex++) {
		const srcPrim = prims[primIndex];
		const srcIndices = srcPrim.getIndices();
		const srcVertexCount = srcPrim.getAttribute('POSITION')!.getCount();
		const srcIndicesArray = srcIndices ? srcIndices.getArray() : null;
		const srcIndicesCount = srcIndices ? srcIndices.getCount() : srcVertexCount;
		const srcRestart = srcIndices ? getPrimitiveRestartIndex(srcIndices.getComponentType()) : null;

		const remap = new Uint32Array(srcVertexCount).fill(EMPTY_U32);

		for (let i = 0; i < srcIndicesCount; i++) {
			const index = srcIndicesArray ? srcIndicesArray[i] : i;
			if (remap[index] === EMPTY_U32 && index !== srcRestart) {
				remap[index] = dstVertexCount++;
			}
		}

		primRemaps.push(remap);
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

	// Allocate room for primitive restart between joined primitives.
	if (isRestartEnabled) {
		dstIndicesCount += prims.length - 1;
	}

	// (5) Allocate joined indices.
	const tplIndices = templatePrim.getIndices();
	const dstIndicesArray = tplIndices ? createIndicesEmpty(dstIndicesCount, dstVertexCount) : null;
	const dstIndices = tplIndices ? shallowCloneAccessor(document, tplIndices).setArray(dstIndicesArray) : null;
	const dstRestart = dstIndices ? getPrimitiveRestartIndex(dstIndices.getComponentType()) : null;
	dstPrim.setIndices(dstIndices);

	// (6) Remap attributes into joined Primitive.
	let dstIndicesOffset = 0;
	for (let primIndex = 0; primIndex < prims.length; primIndex++) {
		const srcPrim = prims[primIndex];
		const srcIndices = srcPrim.getIndices();
		const srcIndicesCount = srcIndices ? srcIndices.getCount() : -1;

		const remap = primRemaps[primIndex];

		if (srcIndices && dstIndices) {
			remapIndices(srcIndices, remap, dstIndices, dstIndicesOffset);
			dstIndicesOffset += srcIndicesCount;

			// Add primitive restart between joined primitives.
			if (isRestartEnabled && primIndex + 1 < prims.length) {
				dstIndicesArray![dstIndicesOffset++] = dstRestart!;
			}
		}

		for (const semantic of dstPrim.listSemantics()) {
			const srcAttribute = srcPrim.getAttribute(semantic)!;
			const dstAttribute = dstPrim.getAttribute(semantic)!;
			remapAttribute(srcAttribute, srcIndices, remap, dstAttribute);
		}
	}

	return dstPrim;
}

/**
 * Internal variant of {@link compactAttribute}. Unlike compactAttribute,
 * assumes the vertex count cannot change, and avoids cloning attributes.
 * @hidden
 * @internal
 */
function remapAttribute(
	srcAttribute: Accessor,
	srcIndices: Accessor | null,
	remap: TypedArray,
	dstAttribute: Accessor,
): void {
	const elementSize = srcAttribute.getElementSize();
	const srcIndicesArray = srcIndices ? srcIndices.getArray() : null;
	const srcVertexCount = srcAttribute.getCount();
	const srcArray = srcAttribute.getArray()!;
	const dstArray = dstAttribute.getArray()!;
	const done = new Uint8Array(srcAttribute.getCount());

	for (let i = 0, il = srcIndices ? srcIndices.getCount() : srcVertexCount; i < il; i++) {
		const srcIndex = srcIndicesArray ? srcIndicesArray[i] : i;
		const dstIndex = remap[srcIndex];
		if (done[dstIndex]) continue;

		for (let j = 0; j < elementSize; j++) {
			dstArray[dstIndex * elementSize + j] = srcArray[srcIndex * elementSize + j];
		}

		done[dstIndex] = 1;
	}
}

/**
 * Internal variant of {@link compactPrimitive}'s index remapping. Avoids
 * cloning indices; writes directly to `dstIndices`.
 * @hidden
 * @internal
 */
function remapIndices(srcIndices: Accessor, remap: TypedArray, dstIndices: Accessor, dstOffset: number): void {
	const srcCount = srcIndices.getCount();
	const srcArray = srcIndices.getArray()!;
	const dstArray = dstIndices.getArray()!;

	const srcRestart = getPrimitiveRestartIndex(srcIndices.getComponentType());
	const dstRestart = getPrimitiveRestartIndex(dstIndices.getComponentType());

	for (let i = 0; i < srcCount; i++) {
		const srcIndex = srcArray[i];
		if (srcIndex === srcRestart) {
			dstArray[dstOffset + i] = dstRestart;
		} else {
			const dstIndex = remap[srcIndex];
			dstArray[dstOffset + i] = dstIndex;
		}
	}
}
