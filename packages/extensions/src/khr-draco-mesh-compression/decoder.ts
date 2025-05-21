import { Accessor, GLTF, TypedArray, TypedArrayConstructor } from '@gltf-transform/core';
import { KHR_DRACO_MESH_COMPRESSION } from '../constants.js';
import type { Attribute, DataType, Decoder, DecoderModule, Mesh } from 'draco3dgltf';

const NAME = KHR_DRACO_MESH_COMPRESSION;

export let decoderModule: DecoderModule;

// Initialized when decoder module loads.
let COMPONENT_ARRAY: { [key: number]: TypedArrayConstructor };
let DATA_TYPE: { [key: number]: DataType };

export function decodeGeometry(decoder: Decoder, data: Uint8Array): Mesh {
	const buffer = new decoderModule.DecoderBuffer();
	try {
		buffer.Init(data as unknown as Int8Array, data.length);

		const geometryType = decoder.GetEncodedGeometryType(buffer);
		if (geometryType !== decoderModule.TRIANGULAR_MESH) {
			throw new Error(`[${NAME}] Unknown geometry type.`);
		}

		const dracoMesh = new decoderModule.Mesh();
		const status = decoder.DecodeBufferToMesh(buffer, dracoMesh);

		if (!status.ok() || dracoMesh.ptr === 0) {
			throw new Error(`[${NAME}] Decoding failure.`);
		}

		return dracoMesh;
	} finally {
		decoderModule.destroy(buffer);
	}
}

export function decodeIndex(decoder: Decoder, mesh: Mesh): Uint16Array | Uint32Array {
	const numFaces = mesh.num_faces();
	const numIndices = numFaces * 3;

	let ptr: number;
	let indices: Uint16Array | Uint32Array;

	if (mesh.num_points() <= 65534) {
		const byteLength = numIndices * Uint16Array.BYTES_PER_ELEMENT;
		ptr = decoderModule._malloc(byteLength);
		decoder.GetTrianglesUInt16Array(mesh, byteLength, ptr);
		indices = new Uint16Array(decoderModule.HEAPU16.buffer, ptr, numIndices).slice();
	} else {
		const byteLength = numIndices * Uint32Array.BYTES_PER_ELEMENT;
		ptr = decoderModule._malloc(byteLength);
		decoder.GetTrianglesUInt32Array(mesh, byteLength, ptr);
		indices = new Uint32Array(decoderModule.HEAPU32.buffer, ptr, numIndices).slice();
	}

	decoderModule._free(ptr);

	return indices;
}

export function decodeAttribute(
	decoder: Decoder,
	mesh: Mesh,
	attribute: Attribute,
	accessorDef: GLTF.IAccessor,
): TypedArray {
	const dataType = DATA_TYPE[accessorDef.componentType];
	const ArrayCtor = COMPONENT_ARRAY[accessorDef.componentType];
	const numComponents = attribute.num_components();
	const numPoints = mesh.num_points();
	const numValues = numPoints * numComponents;
	const byteLength: number = numValues * ArrayCtor.BYTES_PER_ELEMENT;

	const ptr = decoderModule._malloc(byteLength);
	decoder.GetAttributeDataArrayForAllPoints(mesh, attribute, dataType, byteLength, ptr);
	// @ts-expect-error Incorrect types.
	const array: TypedArray = new ArrayCtor(decoderModule.HEAPF32.buffer, ptr, numValues).slice();
	decoderModule._free(ptr);

	return array;
}

export function initDecoderModule(_decoderModule: DecoderModule): void {
	decoderModule = _decoderModule;

	COMPONENT_ARRAY = {
		[Accessor.ComponentType.FLOAT]: Float32Array,
		[Accessor.ComponentType.UNSIGNED_INT]: Uint32Array,
		[Accessor.ComponentType.UNSIGNED_SHORT]: Uint16Array,
		[Accessor.ComponentType.UNSIGNED_BYTE]: Uint8Array,
		[Accessor.ComponentType.SHORT]: Int16Array,
		[Accessor.ComponentType.BYTE]: Int8Array,
	};

	DATA_TYPE = {
		[Accessor.ComponentType.FLOAT]: decoderModule.DT_FLOAT32,
		[Accessor.ComponentType.UNSIGNED_INT]: decoderModule.DT_UINT32,
		[Accessor.ComponentType.UNSIGNED_SHORT]: decoderModule.DT_UINT16,
		[Accessor.ComponentType.UNSIGNED_BYTE]: decoderModule.DT_UINT8,
		[Accessor.ComponentType.SHORT]: decoderModule.DT_INT16,
		[Accessor.ComponentType.BYTE]: decoderModule.DT_INT8,
	};
}
