import { PreparedAccessor, MeshoptFilter, MeshoptMode } from './constants.js';
import {
	Accessor,
	AnimationChannel,
	AnimationSampler,
	BufferUtils,
	Document,
	GLTF,
	MathUtils,
	Primitive,
	PropertyType,
	Root,
	TypedArray,
	TypedArrayConstructor,
	WriterContext,
} from '@gltf-transform/core';
import type { MeshoptEncoder } from 'meshoptimizer';

const { BYTE, SHORT, FLOAT } = Accessor.ComponentType;
const { encodeNormalizedInt, decodeNormalizedInt } = MathUtils;

/** Pre-processes array with required filters or padding. */
export function prepareAccessor(
	accessor: Accessor,
	encoder: typeof MeshoptEncoder,
	mode: MeshoptMode,
	filterOptions: { filter: MeshoptFilter; bits?: number },
): PreparedAccessor {
	const { filter, bits } = filterOptions as { filter: MeshoptFilter; bits: number };
	const result: PreparedAccessor = {
		array: accessor.getArray()!,
		byteStride: accessor.getElementSize() * accessor.getComponentSize(),
		componentType: accessor.getComponentType(),
		normalized: accessor.getNormalized(),
	};

	if (mode !== MeshoptMode.ATTRIBUTES) return result;

	if (filter !== MeshoptFilter.NONE) {
		let array = accessor.getNormalized() ? decodeNormalizedIntArray(accessor) : new Float32Array(result.array);

		switch (filter) {
			case MeshoptFilter.EXPONENTIAL: // → K single-precision floating point values.
				result.byteStride = accessor.getElementSize() * 4;
				result.componentType = FLOAT;
				result.normalized = false;
				result.array = encoder.encodeFilterExp(array, accessor.getCount(), result.byteStride, bits);
				break;

			case MeshoptFilter.OCTAHEDRAL: // → four 8- or 16-bit normalized values.
				result.byteStride = bits > 8 ? 8 : 4;
				result.componentType = bits > 8 ? SHORT : BYTE;
				result.normalized = true;
				array = accessor.getElementSize() === 3 ? padNormals(array) : array;
				result.array = encoder.encodeFilterOct(array, accessor.getCount(), result.byteStride, bits);
				break;

			case MeshoptFilter.QUATERNION: // → four 16-bit normalized values.
				result.byteStride = 8;
				result.componentType = SHORT;
				result.normalized = true;
				result.array = encoder.encodeFilterQuat(array, accessor.getCount(), result.byteStride, bits);
				break;

			default:
				throw new Error('Invalid filter.');
		}

		result.min = accessor.getMin([]);
		result.max = accessor.getMax([]);
		if (accessor.getNormalized()) {
			result.min = result.min.map((v) => decodeNormalizedInt(v, accessor.getComponentType()));
			result.max = result.max.map((v) => decodeNormalizedInt(v, accessor.getComponentType()));
		}
		if (result.normalized) {
			result.min = result.min.map((v) => encodeNormalizedInt(v, result.componentType));
			result.max = result.max.map((v) => encodeNormalizedInt(v, result.componentType));
		}
	} else if (result.byteStride % 4) {
		result.array = padArrayElements(result.array, accessor.getElementSize());
		result.byteStride = result.array.byteLength / accessor.getCount();
	}

	return result;
}

function decodeNormalizedIntArray(attribute: Accessor): Float32Array {
	const componentType = attribute.getComponentType();
	const srcArray = attribute.getArray()!;
	const dstArray = new Float32Array(srcArray.length);
	for (let i = 0; i < srcArray.length; i++) {
		dstArray[i] = decodeNormalizedInt(srcArray[i], componentType);
	}
	return dstArray;
}

/** Pads array to 4 byte alignment, required for Meshopt ATTRIBUTE buffer views. */
export function padArrayElements<T extends TypedArray>(srcArray: T, elementSize: number): T {
	const byteStride = BufferUtils.padNumber(srcArray.BYTES_PER_ELEMENT * elementSize);
	const elementStride = byteStride / srcArray.BYTES_PER_ELEMENT;
	const elementCount = srcArray.length / elementSize;

	const dstArray = new (srcArray.constructor as TypedArrayConstructor)(elementCount * elementStride) as T;

	for (let i = 0; i * elementSize < srcArray.length; i++) {
		for (let j = 0; j < elementSize; j++) {
			dstArray[i * elementStride + j] = srcArray[i * elementSize + j];
		}
	}

	return dstArray;
}

/** Pad normals with a .w component for octahedral encoding. */
function padNormals(srcArray: Float32Array): Float32Array {
	const dstArray = new Float32Array((srcArray.length * 4) / 3);
	for (let i = 0, il = srcArray.length / 3; i < il; i++) {
		dstArray[i * 4] = srcArray[i * 3];
		dstArray[i * 4 + 1] = srcArray[i * 3 + 1];
		dstArray[i * 4 + 2] = srcArray[i * 3 + 2];
	}
	return dstArray;
}

export function getMeshoptMode(accessor: Accessor, usage: string): MeshoptMode {
	if (usage === WriterContext.BufferViewUsage.ELEMENT_ARRAY_BUFFER) {
		const isTriangles = accessor.listParents().some((parent) => {
			return parent instanceof Primitive && parent.getMode() === Primitive.Mode.TRIANGLES;
		});
		return isTriangles ? MeshoptMode.TRIANGLES : MeshoptMode.INDICES;
	}

	return MeshoptMode.ATTRIBUTES;
}

export function getMeshoptFilter(accessor: Accessor, doc: Document): { filter: MeshoptFilter; bits?: number } {
	const refs = doc
		.getGraph()
		.listParentEdges(accessor)
		.filter((edge) => !(edge.getParent() instanceof Root));

	for (const ref of refs) {
		const refName = ref.getName();
		const refKey = (ref.getAttributes().key || '') as string;
		const isDelta = ref.getParent().propertyType === PropertyType.PRIMITIVE_TARGET;

		// Indices.
		if (refName === 'indices') return { filter: MeshoptFilter.NONE };

		// Attributes.
		//
		// NOTES:
		// - Vertex attributes should be filtered IFF they are _not_ quantized in
		//   'packages/cli/src/transforms/meshopt.ts'.
		// - POSITION and TEXCOORD_0 could use exponential filtering, but this produces broken
		//   output in some cases (e.g. Matilda.glb), for unknown reasons. gltfpack uses manual
		//   quantization for these attributes.
		// - NORMAL and TANGENT attributes use Octahedral filters, but deltas in morphs do not.
		// - When specifying bit depth for vertex attributes, check the defaults in `quantize.ts`
		//	 and overrides in `meshopt.ts`. Don't store deltas at higher precision than base.
		if (refName === 'attributes') {
			if (refKey === 'POSITION') return { filter: MeshoptFilter.NONE };
			if (refKey === 'TEXCOORD_0') return { filter: MeshoptFilter.NONE };
			if (refKey.startsWith('JOINTS_')) return { filter: MeshoptFilter.NONE };
			if (refKey.startsWith('WEIGHTS_')) return { filter: MeshoptFilter.NONE };
			if (refKey === 'NORMAL' || refKey === 'TANGENT') {
				return isDelta ? { filter: MeshoptFilter.NONE } : { filter: MeshoptFilter.OCTAHEDRAL, bits: 8 };
			}
		}

		// Animation.
		if (refName === 'output') {
			const targetPath = getTargetPath(accessor);
			if (targetPath === 'rotation') return { filter: MeshoptFilter.QUATERNION, bits: 16 };
			if (targetPath === 'translation') return { filter: MeshoptFilter.EXPONENTIAL, bits: 12 };
			if (targetPath === 'scale') return { filter: MeshoptFilter.EXPONENTIAL, bits: 12 };
			return { filter: MeshoptFilter.NONE };
		}

		// See: https://github.com/donmccurdy/glTF-Transform/issues/489
		if (refName === 'input') return { filter: MeshoptFilter.NONE };

		if (refName === 'inverseBindMatrices') return { filter: MeshoptFilter.NONE };
	}

	return { filter: MeshoptFilter.NONE };
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
