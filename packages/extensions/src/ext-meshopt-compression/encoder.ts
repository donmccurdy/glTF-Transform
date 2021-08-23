import { MeshoptFilter, MeshoptMode } from './constants';
import { Accessor, AnimationChannel, AnimationSampler, AttributeLink, BufferUtils, Document, GLTF, Primitive, TypedArray, TypedArrayConstructor, WriterContext } from '@gltf-transform/core';
import type { MeshoptEncoder } from 'meshoptimizer';

/** Pre-processes array with required filters or padding. */
export function prepareArray(
	accessor: Accessor,
	encoder: typeof MeshoptEncoder,
	mode: MeshoptMode,
	filter: MeshoptFilter
): ({array: TypedArray, byteStride: number}) {
	let array = accessor.getArray()!;
	let byteStride = array.byteLength / accessor.getCount();

	if (mode === MeshoptMode.ATTRIBUTES && filter !== MeshoptFilter.NONE) {
		// TODO(filter): Would need to denormalize accessors here.
		if (filter === MeshoptFilter.EXPONENTIAL) {
			byteStride = accessor.getElementSize() * 4;
			array = encoder.encodeFilterExp(
				new Float32Array(array), accessor.getCount(), byteStride, 12
			);
		} else if (filter === MeshoptFilter.OCTAHEDRAL) {
			array = padArrayElements(array, accessor.getElementSize());
			byteStride = 8;
			array = encoder.encodeFilterOct(
				new Float32Array(array), accessor.getCount(), byteStride, 8
			);
		} else if (filter === MeshoptFilter.QUATERNION) {
			byteStride = 8;
			array = encoder.encodeFilterQuat(
				new Float32Array(array), accessor.getCount(), byteStride, 16
			);
		}
	} else if (mode === MeshoptMode.ATTRIBUTES && byteStride % 4) {
		array = padArrayElements(array, accessor.getElementSize());
		byteStride = array.byteLength / accessor.getCount();
	}

	return {array, byteStride};
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

export function getMeshoptFilter(accessor: Accessor, doc: Document): MeshoptFilter {
	const semantics = doc.getGraph().listParentLinks(accessor)
		.map((link) => (link as AttributeLink).getName())
		.filter((name) => name !== 'accessor');
	for (const semantic of semantics) {
		if (semantic === 'NORMAL') return MeshoptFilter.OCTAHEDRAL;
		if (semantic === 'TANGENT') return MeshoptFilter.OCTAHEDRAL;
		if (semantic.startsWith('JOINTS_')) return MeshoptFilter.NONE;
		if (semantic.startsWith('WEIGHTS_')) return MeshoptFilter.EXPONENTIAL;
		if (semantic === 'output') {
			const targetPath = getTargetPath(accessor);
			if (targetPath === 'rotation') return MeshoptFilter.QUATERNION;
			if (targetPath === 'translation') return MeshoptFilter.EXPONENTIAL;
			if (targetPath === 'scale') return MeshoptFilter.EXPONENTIAL;
			return MeshoptFilter.NONE;
		}
		if (semantic === 'input') return MeshoptFilter.EXPONENTIAL;
		if (semantic === 'inverseBindMatrices') return MeshoptFilter.NONE;
	}

	return MeshoptFilter.EXPONENTIAL;
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
