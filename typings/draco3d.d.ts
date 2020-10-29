/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/interface-name-prefix */
/* eslint-disable @typescript-eslint/prefer-namespace-keyword */
declare module DRACO {
	interface Library {
		createDecoderModule(object?: object): DecoderModule;
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
		DecodeBufferToMesh: (buffer: DecoderBuffer, mesh: Mesh) => Status;
		GetAttributeByUniqueId: (mesh: Mesh, id: number) => Attribute;
		GetFaceFromMesh: (mesh: Mesh, index: number, array: Array) => number;
		GetTrianglesUInt32Array: (mesh: Mesh, byteLength: number, ptr: number) => void;
		GetAttributeDataArrayForAllPoints: (mesh: Mesh, attribute: Attribute, type: DataType, byteLength: number, ptr: number) => void;
		GetAttributeFloatForAllPoints: (mesh: Mesh, attribute: Attribute, array: Array) => void;
		GetAttributeInt8ForAllPoints: (mesh: Mesh, attribute: Attribute, array: Array) => void;
		GetAttributeInt16ForAllPoints: (mesh: Mesh, attribute: Attribute, array: Array) => void;
		GetAttributeInt32ForAllPoints: (mesh: Mesh, attribute: Attribute, array: Array) => void;
		GetAttributeUInt8ForAllPoints: (mesh: Mesh, attribute: Attribute, array: Array) => void;
		GetAttributeUInt16ForAllPoints: (mesh: Mesh, attribute: Attribute, array: Array) => void;
		GetAttributeUInt32ForAllPoints: (mesh: Mesh, attribute: Attribute, array: Array) => void;
		GetEncodedGeometryType: (buffer: Buffer) => GeometryType;
	}
	interface DecoderBuffer {
		Init: (array: Int8Array, byteLength: number) => void;
	}
	interface Mesh {
		ptr: number;
		num_faces: () => number;
		num_points: () => number;
	}
	interface Attribute {
		num_components: () => number;
	}
	interface Array {
		GetValue: (index: number) => number;
	}
	interface Status {
		ok: () => boolean;
	}
	enum GeometryType {}
	enum DataType {}
}
