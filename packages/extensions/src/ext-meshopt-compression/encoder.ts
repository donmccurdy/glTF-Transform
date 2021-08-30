import { PreparedAccessor, MeshoptFilter, MeshoptMode } from './constants';
import { Accessor, AnimationChannel, AnimationSampler, AttributeLink, BufferUtils, Document, GLTF, MathUtils, Primitive, TypedArray, TypedArrayConstructor, WriterContext } from '@gltf-transform/core';
import type { MeshoptEncoder } from 'meshoptimizer';

const {BYTE, SHORT} = Accessor.ComponentType;

/** Pre-processes array with required filters or padding. */
export function prepareAccessor(
	accessor: Accessor,
	encoder: typeof MeshoptEncoder,
	mode: MeshoptMode,
	filterOptions: {filter: MeshoptFilter, bits?: number}
): PreparedAccessor {
	let array = accessor.getArray()!;
	let byteStride = array.byteLength / accessor.getCount();
	let normalized = accessor.getNormalized();
	let componentType = accessor.getComponentType();
	const {filter, bits} = filterOptions as {filter: MeshoptFilter, bits: number};

	if (mode !== MeshoptMode.ATTRIBUTES) {
		return {array, byteStride, componentType, normalized};
	}

	if (filter !== MeshoptFilter.NONE) {
		array = accessor.getNormalized()
			? denormalizeArray(accessor)
			: new Float32Array(array);

		switch (filter) {
			case MeshoptFilter.EXPONENTIAL: // → K single-precision floating point values.
				byteStride = accessor.getElementSize() * 4;
				array = encoder.encodeFilterExp(array, accessor.getCount(), byteStride, bits);
				break;

			case MeshoptFilter.OCTAHEDRAL: // → four 8- or 16-bit normalized values.
				componentType = bits > 8 ? SHORT : BYTE;
				byteStride = bits > 8 ? 8 : 4;
				normalized = true;
				array = accessor.getElementSize() === 3 ? padNormals(array) : array;
				array = encoder.encodeFilterOct(array, accessor.getCount(), byteStride, bits);
				break;

			case MeshoptFilter.QUATERNION: // → four 16-bit normalized values.
				byteStride = 8;
				componentType = SHORT;
				normalized = true;
				array = encoder.encodeFilterQuat(array, accessor.getCount(), byteStride, bits);
				break;

			default:
				throw new Error('Invalid filter.');
		}

	} else if (byteStride % 4) {
		array = padArrayElements(array, accessor.getElementSize());
		byteStride = array.byteLength / accessor.getCount();
	}

	return {array, byteStride, componentType, normalized};
}

function denormalizeArray(attribute: Accessor): Float32Array {
	const componentType = attribute.getComponentType();
	const srcArray = attribute.getArray()!;
	const dstArray = new Float32Array(srcArray.length);
	for (let i = 0; i < srcArray.length; i++) {
		dstArray[i] = MathUtils.denormalize(srcArray[i], componentType);
	}
	return dstArray;
}

/** Pads array to 4 byte alignment, required for Meshopt ATTRIBUTE buffer views. */
export function padArrayElements<T extends TypedArray>(srcArray: T, elementSize: number): T {
	const byteStride = BufferUtils.padNumber(srcArray.BYTES_PER_ELEMENT * elementSize);
	const elementStride = byteStride / srcArray.BYTES_PER_ELEMENT;
	const elementCount = srcArray.length / elementSize;

	const dstArray =
		new (srcArray.constructor as TypedArrayConstructor)(elementCount * elementStride) as T;

	for (let i = 0; i * elementSize < srcArray.length; i++) {
		for (let j = 0; j < elementSize; j++) {
			dstArray[i * elementStride + j] = srcArray[i * elementSize + j];
		}
	}

	return dstArray;
}

/** Pad normals with a .w component for octahedral encoding. */
function padNormals(srcArray: Float32Array): Float32Array {
	const dstArray = new Float32Array(srcArray.length * 4 / 3);
	for (let i = 0, il = srcArray.length / 3; i < il; i++) {
		dstArray[i * 4] = srcArray[i * 3];
		dstArray[i * 4 + 1] = srcArray[i * 3 + 1];
		dstArray[i * 4 + 2] = srcArray[i * 3 + 2];
	}
	return dstArray;
}

export function getMeshoptMode(accessor: Accessor, usage: string): MeshoptMode {
	if (usage === WriterContext.BufferViewUsage.ELEMENT_ARRAY_BUFFER) {
		const isTriangles = accessor.listParents()
			.some((parent) => {
				return parent instanceof Primitive && parent.getMode() === Primitive.Mode.TRIANGLES;
			});
		return isTriangles ? MeshoptMode.TRIANGLES : MeshoptMode.INDICES;
	}

	return MeshoptMode.ATTRIBUTES;
}

export function getMeshoptFilter(accessor: Accessor, doc: Document): {filter: MeshoptFilter, bits?: number} {
	const semantics = doc.getGraph().listParentLinks(accessor)
		.map((link) => (link as AttributeLink).getName())
		.filter((name) => name !== 'accessor');
	for (const semantic of semantics) {
		// Attributes.
		if (semantic === 'NORMAL') return {filter: MeshoptFilter.OCTAHEDRAL, bits: 8};
		if (semantic === 'TANGENT') return {filter: MeshoptFilter.OCTAHEDRAL, bits: 8};
		if (semantic.startsWith('JOINTS_')) return {filter: MeshoptFilter.NONE};
		if (semantic.startsWith('WEIGHTS_')) return {filter: MeshoptFilter.NONE};

		// Animation.
		if (semantic === 'output') {
			const targetPath = getTargetPath(accessor);
			if (targetPath === 'rotation') return {filter: MeshoptFilter.QUATERNION, bits: 16};
			if (targetPath === 'translation') return {filter: MeshoptFilter.EXPONENTIAL, bits: 12};
			if (targetPath === 'scale') return {filter: MeshoptFilter.EXPONENTIAL, bits: 12};
			return {filter: MeshoptFilter.NONE};
		}
		if (semantic === 'input') return {filter: MeshoptFilter.EXPONENTIAL, bits: 12};
		if (semantic === 'inverseBindMatrices') return {filter: MeshoptFilter.NONE};
	}
	return {filter: MeshoptFilter.EXPONENTIAL, bits: 12};
}

export function getTargetPath(accessor: Accessor): GLTF.AnimationChannelTargetPath | null {
	for (const sampler of accessor.listParents()) {
		if (!(sampler instanceof AnimationSampler)) continue;
		for (const channel of sampler.listParents()) {
			if (!(channel instanceof AnimationChannel)) continue;
			return channel.getTargetPath();
		}
	}
	return null;
}
