import { Accessor, type bbox, type GLTF, type Primitive, type TypedArray } from '@gltf-transform/core';
import type { EncoderModule, Mesh, MeshBuilder } from 'draco3dgltf';

export let encoderModule: EncoderModule;

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
	attributeIDs: { [key: string]: number };
}

export interface EncoderOptions {
	decodeSpeed?: number;
	encodeSpeed?: number;
	method?: EncoderMethod;
	quantizationBits?: { [key: string]: number };
	quantizationVolume?: 'mesh' | 'scene' | bbox;
}

const DEFAULT_ENCODER_OPTIONS: EncoderOptions = {
	decodeSpeed: 5,
	encodeSpeed: 5,
	method: EncoderMethod.EDGEBREAKER,
	quantizationBits: DEFAULT_QUANTIZATION_BITS,
	quantizationVolume: 'mesh',
};

export function initEncoderModule(_encoderModule: EncoderModule): void {
	encoderModule = _encoderModule;
}

/**
 * References:
 * - https://github.com/mrdoob/three.js/blob/dev/examples/js/exporters/DRACOExporter.js
 * - https://github.com/CesiumGS/gltf-pipeline/blob/master/lib/compressDracoMeshes.js
 */
export function encodeGeometry(prim: Primitive, _options: EncoderOptions = DEFAULT_ENCODER_OPTIONS): EncodedPrimitive {
	const options = { ...DEFAULT_ENCODER_OPTIONS, ..._options } as Required<EncoderOptions>;
	options.quantizationBits = { ...DEFAULT_QUANTIZATION_BITS, ..._options.quantizationBits };

	const builder = new encoderModule.MeshBuilder();
	const mesh = new encoderModule.Mesh();

	const encoder = new encoderModule.ExpertEncoder(mesh);

	const attributeIDs: { [key: string]: number } = {};
	const dracoBuffer = new encoderModule.DracoInt8Array();

	const hasMorphTargets = prim.listTargets().length > 0;
	let hasSparseAttributes = false;

	for (const semantic of prim.listSemantics()) {
		const attribute = prim.getAttribute(semantic)!;

		if (attribute.getSparse()) {
			hasSparseAttributes = true;
			continue;
		}

		const attributeEnum = getAttributeEnum(semantic);
		const attributeID: number = addAttribute(
			builder,
			attribute.getComponentType(),
			mesh,
			encoderModule[attributeEnum],
			attribute.getCount(),
			attribute.getElementSize(),
			attribute.getArray()!,
		);

		if (attributeID === -1) throw new Error(`Error compressing "${semantic}" attribute.`);

		attributeIDs[semantic] = attributeID;
		if (options.quantizationVolume === 'mesh' || semantic !== 'POSITION') {
			encoder.SetAttributeQuantization(attributeID, options.quantizationBits[attributeEnum]);
		} else if (typeof options.quantizationVolume === 'object') {
			const { quantizationVolume } = options;
			const range = Math.max(
				quantizationVolume.max[0] - quantizationVolume.min[0],
				quantizationVolume.max[1] - quantizationVolume.min[1],
				quantizationVolume.max[2] - quantizationVolume.min[2],
			);
			encoder.SetAttributeExplicitQuantization(
				attributeID,
				options.quantizationBits[attributeEnum],
				attribute.getElementSize(),
				quantizationVolume.min,
				range,
			);
		} else {
			throw new Error('Invalid quantization volume state.');
		}
	}

	const indices = prim.getIndices();
	if (!indices) throw new EncodingError('Primitive must have indices.');

	builder.AddFacesToMesh(mesh, indices.getCount() / 3, indices.getArray() as unknown as Uint32Array);

	encoder.SetSpeedOptions(options.encodeSpeed, options.decodeSpeed);
	encoder.SetTrackEncodedProperties(true);

	// TODO(cleanup): Use edgebreaker without deduplication if possible.
	// See https://github.com/google/draco/issues/929.
	if (options.method === EncoderMethod.SEQUENTIAL || hasMorphTargets || hasSparseAttributes) {
		encoder.SetEncodingMethod(encoderModule.MESH_SEQUENTIAL_ENCODING);
	} else {
		encoder.SetEncodingMethod(encoderModule.MESH_EDGEBREAKER_ENCODING);
	}

	// Encode, preserving vertex order for primitives with morph targets and sparse accessors.
	const byteLength = encoder.EncodeToDracoBuffer(!(hasMorphTargets || hasSparseAttributes), dracoBuffer);
	if (byteLength <= 0) throw new EncodingError('Error applying Draco compression.');

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

	return { numVertices, numIndices, data, attributeIDs };
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

function addAttribute(
	builder: MeshBuilder,
	componentType: GLTF.AccessorComponentType,
	mesh: Mesh,
	attribute: number,
	count: number,
	itemSize: number,
	array: TypedArray,
): number {
	switch (componentType) {
		case Accessor.ComponentType.UNSIGNED_BYTE:
			return builder.AddUInt8Attribute(mesh, attribute, count, itemSize, array);
		case Accessor.ComponentType.BYTE:
			return builder.AddInt8Attribute(mesh, attribute, count, itemSize, array);
		case Accessor.ComponentType.UNSIGNED_SHORT:
			return builder.AddUInt16Attribute(mesh, attribute, count, itemSize, array);
		case Accessor.ComponentType.SHORT:
			return builder.AddInt16Attribute(mesh, attribute, count, itemSize, array);
		case Accessor.ComponentType.UNSIGNED_INT:
			return builder.AddUInt32Attribute(mesh, attribute, count, itemSize, array);
		case Accessor.ComponentType.FLOAT:
			return builder.AddFloatAttribute(mesh, attribute, count, itemSize, array);
		default:
			throw new Error(`Unexpected component type, "${componentType}".`);
	}
}

export class EncodingError extends Error {}
