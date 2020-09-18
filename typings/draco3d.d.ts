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
		TRIANGULAR_MESH: GeometryType;
	}
	interface Decoder {
		DecodeBufferToMesh: (buffer: DecoderBuffer, mesh: Mesh) => Status;
		GetAttributeByUniqueId: (mesh: Mesh, id: number) => Attribute;
		GetFaceFromMesh: (mesh: Mesh, number, array: Array) => number;
		GetAttributeFloatForAllPoints: (mesh: Mesh, attribute: Attribute, array: Array) => void;
		GetAttributeInt8ForAllPoints: (mesh: Mesh, attribute: Attribute, array: Array) => void;
		GetAttributeInt16ForAllPoints: (mesh: Mesh, attribute: Attribute, array: Array) => void;
		GetAttributeInt32ForAllPoints: (mesh: Mesh, attribute: Attribute, array: Array) => void;
		GetAttributeUInt8ForAllPoints: (mesh: Mesh, attribute: Attribute, array: Array) => void;
		GetAttributeUInt16ForAllPoints: (mesh: Mesh, attribute: Attribute, array: Array) => void;
		GetAttributeUInt32ForAllPoints: (mesh: Mesh, attribute: Attribute, array: Array) => void;
		GetEncodedGeometryType: (Buffer) => GeometryType;
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
}
