/* eslint-disable @typescript-eslint/no-namespace */

type TypedArray = Float32Array | Uint32Array | Uint16Array | Uint8Array | Int16Array | Int8Array;

/* eslint-disable @typescript-eslint/prefer-namespace-keyword */
export declare module DRACO {
	interface Library {
		createDecoderModule(object?: Record<string, unknown>): DecoderModule;
		createEncoderModule(object?: Record<string, unknown>): EncoderModule;
	}

	interface DecoderModule {
		Decoder: new () => Decoder;
		DecoderBuffer: new () => DecoderBuffer;
		Mesh: new () => Mesh;
		DracoFloat32Array: new () => Array;
		DracoInt8Array: new () => Array;
		DracoInt16Array: new () => Array;
		DracoInt32Array: new () => Array;
		DracoUInt8Array: new () => Array;
		DracoUInt16Array: new () => Array;
		DracoUInt32Array: new () => Array;
		destroy: (object: unknown) => void;
		_malloc: (ptr: number) => number;
		_free: (ptr: number) => void;

		// Heap.
		HEAPF32: Float32Array;
		HEAP32: Int32Array;
		HEAP16: Int16Array;
		HEAP8: Int8Array;
		HEAPU32: Uint32Array;
		HEAPU16: Uint16Array;
		HEAPU8: Uint8Array;

		// GeometryType.
		TRIANGULAR_MESH: GeometryType;
		POINT_CLOUD: GeometryType;

		// DataType.
		DT_FLOAT32: DataType;
		DT_INT8: DataType;
		DT_INT16: DataType;
		DT_INT32: DataType;
		DT_UINT8: DataType;
		DT_UINT16: DataType;
		DT_UINT32: DataType;
	}
	interface Decoder {
		DecodeBufferToMesh(buffer: DecoderBuffer, mesh: Mesh): Status;
		GetAttributeByUniqueId: (mesh: Mesh, id: number) => Attribute;
		GetFaceFromMesh: (mesh: Mesh, index: number, array: Array) => number;
		GetTrianglesUInt32Array: (mesh: Mesh, byteLength: number, ptr: number) => void;
		GetAttributeDataArrayForAllPoints: (
			mesh: Mesh,
			attribute: Attribute,
			type: DataType,
			byteLength: number,
			ptr: number
		) => void;
		GetAttributeFloatForAllPoints: (mesh: Mesh, attribute: Attribute, array: Array) => void;
		GetAttributeInt8ForAllPoints: (mesh: Mesh, attribute: Attribute, array: Array) => void;
		GetAttributeInt16ForAllPoints: (mesh: Mesh, attribute: Attribute, array: Array) => void;
		GetAttributeInt32ForAllPoints: (mesh: Mesh, attribute: Attribute, array: Array) => void;
		GetAttributeUInt8ForAllPoints: (mesh: Mesh, attribute: Attribute, array: Array) => void;
		GetAttributeUInt16ForAllPoints: (mesh: Mesh, attribute: Attribute, array: Array) => void;
		GetAttributeUInt32ForAllPoints: (mesh: Mesh, attribute: Attribute, array: Array) => void;
		GetEncodedGeometryType: (buffer: DecoderBuffer) => GeometryType;
	}
	interface DecoderBuffer {
		Init: (array: Int8Array, byteLength: number) => void;
	}
	interface Mesh {
		ptr: number;
		num_faces: () => number;
		num_points: () => number;
	}
	interface MeshBuilder {
		AddFacesToMesh(mesh: Mesh, numFaces: number, faces: Uint16Array | Uint32Array): void;
		AddUInt8Attribute(
			mesh: Mesh,
			attribute: number,
			count: number,
			itemSize: number,
			array: TypedArray
		): void;
		AddInt8Attribute(
			mesh: Mesh,
			attribute: number,
			count: number,
			itemSize: number,
			array: TypedArray
		): void;
		AddUInt16Attribute(
			mesh: Mesh,
			attribute: number,
			count: number,
			itemSize: number,
			array: TypedArray
		): void;
		AddInt16Attribute(
			mesh: Mesh,
			attribute: number,
			count: number,
			itemSize: number,
			array: TypedArray
		): void;
		AddUInt32Attribute(
			mesh: Mesh,
			attribute: number,
			count: number,
			itemSize: number,
			array: TypedArray
		): void;
		AddFloatAttribute(
			mesh: Mesh,
			attribute: number,
			count: number,
			itemSize: number,
			array: TypedArray
		): void;
	}
	interface Attribute {
		num_components: () => number;
	}
	interface Array {
		GetValue: (index: number) => number;
	}
	interface DracoInt8Array {
		GetValue: (index: number) => number;
	}

	interface Status {
		ok: () => boolean;
	}
	enum GeometryType {}
	enum DataType {}

	interface EncoderModule {
		Encoder: new () => Encoder;
		Mesh: new () => Mesh;
		MeshBuilder: new () => MeshBuilder;
		DracoInt8Array: new () => DracoInt8Array;

		POSITION: number;
		NORMAL: number;
		TEX_COORD: number;
		COLOR: number;
		GENERIC: number;

		MESH_SEQUENTIAL_ENCODING: number;
		MESH_EDGEBREAKER_ENCODING: number;

		destroy: (object: unknown) => void;
	}

	interface Encoder {
		SetAttributeQuantization(attribute: number, bits: number): void;
		SetSpeedOptions(encodeSpeed: number, decodeSpeed: number): void;
		SetEncodingMethod(method: number): void;
		SetTrackEncodedProperties(track: boolean): void;
		EncodeMeshToDracoBuffer(mesh: Mesh, array: DracoInt8Array): number;
		GetNumberOfEncodedPoints(): number;
		GetNumberOfEncodedFaces(): number;
	}
}
