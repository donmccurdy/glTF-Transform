import { TypedArray } from '@gltf-transform/core';

// TODO(bug): Import makes builds very slow, and increases size to 250kb. Require the user to
// install this as a dependency, at least on web?
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const decoderModule: DRACO.DecoderModule = require('draco3dgltf').createDecoderModule({});

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

export function decodeIndex(decoder: DRACO.Decoder, geometry: DRACO.Mesh): Uint32Array {
	const numFaces = geometry.num_faces();
	const numIndices = numFaces * 3;
	const index = new Uint32Array( numIndices );
	const dracoIndices = new decoderModule.DracoInt32Array();

	for (let i = 0; i < numFaces; i++) {
		decoder.GetFaceFromMesh(geometry, i, dracoIndices);
		for (let j = 0; j < 3; ++ j) {
			index[ i * 3 + j ] = dracoIndices.GetValue( j );
		}
	}

	decoderModule.destroy(dracoIndices);

	return index;
}

export function decodeAttribute(
		decoder: DRACO.Decoder,
		geometry: DRACO.Mesh,
		attribute: DRACO.Attribute,
		accessorDef: GLTF.IAccessor): TypedArray {

	const componentType = componentTypeToArray(accessorDef.componentType);
	const numComponents = attribute.num_components();
	const numPoints = geometry.num_points();
	const numValues = numPoints * numComponents;

	let dracoArray;
	let array;

	switch (componentType) {

		case Float32Array:
			dracoArray = new decoderModule.DracoFloat32Array();
			decoder.GetAttributeFloatForAllPoints(geometry, attribute, dracoArray);
			array = new Float32Array(numValues);
			break;

		case Int8Array:
			dracoArray = new decoderModule.DracoInt8Array();
			decoder.GetAttributeInt8ForAllPoints(geometry, attribute, dracoArray);
			array = new Int8Array(numValues);
			break;

		case Int16Array:
			dracoArray = new decoderModule.DracoInt16Array();
			decoder.GetAttributeInt16ForAllPoints(geometry, attribute, dracoArray);
			array = new Int16Array(numValues);
			break;

		case Uint8Array:
			dracoArray = new decoderModule.DracoUInt8Array();
			decoder.GetAttributeUInt8ForAllPoints(geometry, attribute, dracoArray);
			array = new Uint8Array(numValues);
			break;

		case Uint16Array:
			dracoArray = new decoderModule.DracoUInt16Array();
			decoder.GetAttributeUInt16ForAllPoints(geometry, attribute, dracoArray);
			array = new Uint16Array(numValues);
			break;

		case Uint32Array:
			dracoArray = new decoderModule.DracoUInt32Array();
			decoder.GetAttributeUInt32ForAllPoints(geometry, attribute, dracoArray);
			array = new Uint32Array(numValues);
			break;

		default:
			throw new Error('Unexpected attribute type.');

	}

	for (let i = 0; i < numValues; i ++) {
		array[i] = dracoArray.GetValue(i);
	}

	decoderModule.destroy(dracoArray);
	return array;
}

function componentTypeToArray (componentType: GLTF.AccessorComponentType): new () => TypedArray {
	switch (componentType) {

		case GLTF.AccessorComponentType.FLOAT:
			return Float32Array;

		case GLTF.AccessorComponentType.UNSIGNED_INT:
			return Uint32Array;

		case GLTF.AccessorComponentType.UNSIGNED_SHORT:
			return Uint16Array;

		case GLTF.AccessorComponentType.UNSIGNED_BYTE:
			return Uint8Array;

		case GLTF.AccessorComponentType.SHORT:
			return Int16Array;

		case GLTF.AccessorComponentType.BYTE:
			return Int8Array;

	}
}
