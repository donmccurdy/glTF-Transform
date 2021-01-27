import { Accessor, Primitive } from '@gltf-transform/core';
import { DRACO } from '../types/draco3d';

export let encoderModule: DRACO.EncoderModule;

export enum EncoderMethod {
	EDGEBREAKER = 1,
	SEQUENTIAL = 0,
}

enum AttributeEnum {
	POSITION = 'POSITION',
	NORMAL = 'NORMAL',
	COLOR = 'COLOR',
	TEX_COORD = 'TEX_COORD',
	GENERIC = 'GENERIC',
}

const DEFAULT_QUANTIZATION_BITS = {
	[AttributeEnum.POSITION]: 14,
	[AttributeEnum.NORMAL]: 10,
	[AttributeEnum.COLOR]: 8,
	[AttributeEnum.TEX_COORD]: 12,
	[AttributeEnum.GENERIC]: 12,
};

export interface EncodedPrimitive {
	numVertices: number;
	numIndices: number;
	data: Uint8Array;
	attributeIDs: {[key: string]: number};
}

export interface EncoderOptions {
	decodeSpeed?: number;
	encodeSpeed?: number;
	method?: EncoderMethod;
	quantizationBits?: {[key: string]: number};
}

const DEFAULT_ENCODER_OPTIONS: EncoderOptions = {
	decodeSpeed: 5,
	encodeSpeed: 5,
	method: EncoderMethod.EDGEBREAKER,
	quantizationBits: DEFAULT_QUANTIZATION_BITS,
};

export function initEncoderModule (_encoderModule: DRACO.EncoderModule): void {
	encoderModule = _encoderModule;
}

/**
 * References:
 * - https://github.com/mrdoob/three.js/blob/dev/examples/js/exporters/DRACOExporter.js
 * - https://github.com/CesiumGS/gltf-pipeline/blob/master/lib/compressDracoMeshes.js
 */
export function encodeGeometry (prim: Primitive, _options: EncoderOptions = DEFAULT_ENCODER_OPTIONS): EncodedPrimitive {
	const options = {...DEFAULT_ENCODER_OPTIONS, ..._options};
	options.quantizationBits = {...DEFAULT_QUANTIZATION_BITS, ..._options.quantizationBits};

	const encoder = new encoderModule.Encoder();
	const builder = new encoderModule.MeshBuilder();
	const mesh = new encoderModule.Mesh();

	const attributeIDs: {[key: string]: number} = {};
	const dracoBuffer = new encoderModule.DracoInt8Array();

	for (const semantic of prim.listSemantics()) {
		const attribute = prim.getAttribute(semantic)!;
		const attributeEnum = getAttributeEnum(semantic);
		const addAttributeFn = ADD_ATTRIBUTE_FN[attribute.getComponentType()];
		const attributeID: number = builder[addAttributeFn](
			mesh,
			encoderModule[attributeEnum],
			attribute.getCount(),
			attribute.getElementSize(),
			attribute.getArray(),
		);

		if (attributeID === -1) throw new Error(`Error compressing "${semantic}" attribute.`);

		attributeIDs[semantic] = attributeID;
		encoder.SetAttributeQuantization(
			encoderModule[attributeEnum],
			options.quantizationBits[attributeEnum]
		);
	}

	const indices = prim.getIndices();
	if (!indices) throw new Error('Primitive must have indices.');

	builder.AddFacesToMesh(
		mesh,
		indices.getCount() / 3,
		indices.getArray() as unknown as Uint32Array
	);

	encoder.SetSpeedOptions(options.encodeSpeed!, options.decodeSpeed!);
	encoder.SetTrackEncodedProperties(true);

	// Preserve vertex order for primitives with morph targets.
	if (prim.listTargets().length > 0 || options.method === EncoderMethod.SEQUENTIAL) {
		encoder.SetEncodingMethod(encoderModule.MESH_SEQUENTIAL_ENCODING);
	} else {
		encoder.SetEncodingMethod(encoderModule.MESH_EDGEBREAKER_ENCODING);
	}

	const byteLength = encoder.EncodeMeshToDracoBuffer(mesh, dracoBuffer);
	if (byteLength <= 0) throw new Error('Error applying Draco compression.');

	const data = new Uint8Array(byteLength);
	for (let i = 0; i < byteLength; ++i) {
		data[i] = dracoBuffer.GetValue(i);
	}

	const numVertices = encoder.GetNumberOfEncodedPoints();
	const numIndices = encoder.GetNumberOfEncodedFaces() * 3;

	encoderModule.destroy(dracoBuffer);
	encoderModule.destroy(mesh);
	encoderModule.destroy(builder);
	encoderModule.destroy(encoder);

	return {numVertices, numIndices, data, attributeIDs};
}

function getAttributeEnum(semantic: string): AttributeEnum {
	if (semantic === 'POSITION') {
		return AttributeEnum.POSITION;
	} else if (semantic === 'NORMAL') {
		return AttributeEnum.NORMAL;
	} else if (semantic.startsWith('COLOR_')) {
		return AttributeEnum.COLOR;
	} else if (semantic.startsWith('TEXCOORD_')) {
		return AttributeEnum.TEX_COORD;
	}
	return AttributeEnum.GENERIC;
}

const ADD_ATTRIBUTE_FN = {
	[Accessor.ComponentType.UNSIGNED_BYTE]: 'AddUInt8Attribute',
	[Accessor.ComponentType.BYTE]: 'AddInt8Attribute',
	[Accessor.ComponentType.UNSIGNED_SHORT]: 'AddUInt16Attribute',
	[Accessor.ComponentType.SHORT]: 'AddInt16Attribute',
	[Accessor.ComponentType.UNSIGNED_INT]: 'AddUInt32Attribute',
	[Accessor.ComponentType.FLOAT]: 'AddFloatAttribute',
};
