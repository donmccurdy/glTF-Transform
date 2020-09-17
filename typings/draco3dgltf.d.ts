/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/interface-name-prefix */
/* eslint-disable @typescript-eslint/prefer-namespace-keyword */
declare module DRACO {
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
		DecodeBufferToMesh: (Buffer, Mesh) => Status;
		GetAttributeByUniqueId: (Mesh, number) => Attribute;
		GetFaceFromMesh: (Mesh, number, Array) => number;
		GetAttributeFloatForAllPoints: (Mesh, Attribute, Array) => void;
		GetAttributeInt8ForAllPoints: (Mesh, Attribute, Array) => void;
		GetAttributeInt16ForAllPoints: (Mesh, Attribute, Array) => void;
		GetAttributeInt32ForAllPoints: (Mesh, Attribute, Array) => void;
		GetAttributeUInt8ForAllPoints: (Mesh, Attribute, Array) => void;
		GetAttributeUInt16ForAllPoints: (Mesh, Attribute, Array) => void;
		GetAttributeUInt32ForAllPoints: (Mesh, Attribute, Array) => void;
		GetEncodedGeometryType: (Buffer) => GeometryType;
	}
	interface DecoderBuffer {
		Init: (Int8Array, number) => void;
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
		GetValue: (number) => number;
	}
	interface Status {
		ok: () => boolean;
	}
	enum GeometryType {}
}
