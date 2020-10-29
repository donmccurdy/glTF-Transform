import { GLTF, TypedArray, TypedArrayConstructor } from '@gltf-transform/core';
import { DRACO } from '../types/draco3d';

export let decoderModule: DRACO.DecoderModule;

// Initialized when decoder module loads.
let COMPONENT_ARRAY: {[key: number]: TypedArrayConstructor};
let DATA_TYPE: {[key: number]: DRACO.DataType};

export function decodeGeometry(decoder: DRACO.Decoder, arrayBuffer: ArrayBuffer): DRACO.Mesh {
	let buffer: DRACO.DecoderBuffer;
	try {
		buffer = new decoderModule.DecoderBuffer();
		buffer.Init(new Int8Array(arrayBuffer), arrayBuffer.byteLength);
		const geometryType = decoder.GetEncodedGeometryType(buffer);

		if (geometryType !== decoderModule.TRIANGULAR_MESH) {
			throw new Error('Unknown geometry type.');
		}

		const dracoMesh = new decoderModule.Mesh();
		const status = decoder.DecodeBufferToMesh(buffer, dracoMesh);

		if (!status.ok() || dracoMesh.ptr === 0) {
			throw new Error('Decoding failure.');
		}

		return dracoMesh;
	} finally {
		decoderModule.destroy(buffer);
	}
}

export function decodeIndex(decoder: DRACO.Decoder, mesh: DRACO.Mesh): Uint32Array {
	const numFaces = mesh.num_faces();
	const numIndices = numFaces * 3;
	const byteLength = numIndices * Uint32Array.BYTES_PER_ELEMENT;

	const ptr = decoderModule._malloc(byteLength);
	decoder.GetTrianglesUInt32Array(mesh, byteLength, ptr);
	const indices = new Uint32Array(decoderModule.HEAP32.buffer, ptr, numIndices).slice();
	decoderModule._free(ptr);

	return indices;
}

export function decodeAttribute(
		decoder: DRACO.Decoder,
		mesh: DRACO.Mesh,
		attribute: DRACO.Attribute,
		accessorDef: GLTF.IAccessor): TypedArray {

	const dataType = DATA_TYPE[accessorDef.componentType];
	const ArrayCtor = COMPONENT_ARRAY[accessorDef.componentType];
	const numComponents = attribute.num_components();
	const numPoints = mesh.num_points();
	const numValues = numPoints * numComponents;
	const byteLength: number = numValues * ArrayCtor.BYTES_PER_ELEMENT;

	const ptr = decoderModule._malloc(byteLength);
	decoder.GetAttributeDataArrayForAllPoints(mesh, attribute, dataType, byteLength, ptr);
	const array: TypedArray = new ArrayCtor(decoderModule.HEAPF32.buffer, ptr, numValues).slice();
	decoderModule._free(ptr);

	return array;
}

export function initDecoderModule (_decoderModule: DRACO.DecoderModule): void {
	decoderModule = _decoderModule;

	COMPONENT_ARRAY = {
		[GLTF.AccessorComponentType.FLOAT]: Float32Array,
		[GLTF.AccessorComponentType.UNSIGNED_INT]: Uint32Array,
		[GLTF.AccessorComponentType.UNSIGNED_SHORT]: Uint16Array,
		[GLTF.AccessorComponentType.UNSIGNED_BYTE]: Uint8Array,
		[GLTF.AccessorComponentType.SHORT]: Int16Array,
		[GLTF.AccessorComponentType.BYTE]: Int8Array,
	};

	DATA_TYPE = {
		[GLTF.AccessorComponentType.FLOAT]: decoderModule.DT_FLOAT32,
		[GLTF.AccessorComponentType.UNSIGNED_INT]: decoderModule.DT_UINT32,
		[GLTF.AccessorComponentType.UNSIGNED_SHORT]: decoderModule.DT_UINT16,
		[GLTF.AccessorComponentType.UNSIGNED_BYTE]: decoderModule.DT_UINT8,
		[GLTF.AccessorComponentType.SHORT]: decoderModule.DT_INT16,
		[GLTF.AccessorComponentType.BYTE]: decoderModule.DT_INT8,
	};
}

