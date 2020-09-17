import { Extension, GLB_BUFFER, PropertyType, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_DRACO_MESH_COMPRESSION } from '../constants';

const NAME = KHR_DRACO_MESH_COMPRESSION;

interface DracoPrimitiveExtension {
	bufferView: number;
	attributes: {
		[name: string]: number;
	};
}

interface DracoGeometry {
	ptr: number;
	num_faces: () => number;
	num_points: () => number;
}

// TODO(bug): Import makes builds very slow, and increases size to 250kb.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const decoderModule = require('draco3dgltf').createDecoderModule({});

/** Documentation in {@link EXTENSIONS.md}. */
export class DRACOMeshCompression extends Extension {
	public readonly extensionName = NAME;
	public readonly provideTypes = [PropertyType.PRIMITIVE];
	public static readonly EXTENSION_NAME = NAME;

	public provide(context: ReaderContext): this {
		const jsonDoc = context.jsonDoc;
		const decoder = new decoderModule.Decoder();
		const dracoGeometries: Map<number, DracoGeometry> = new Map();

		// Reference: https://github.com/mrdoob/three.js/blob/dev/examples/js/loaders/DRACOLoader.js
		for (const meshDef of jsonDoc.json.meshes) {
			for (const primDef of meshDef.primitives) {
				if (primDef.extensions && primDef.extensions[NAME]) {
					const dracoDef = primDef.extensions[NAME] as DracoPrimitiveExtension;
					let dracoGeometry = dracoGeometries.get(dracoDef.bufferView);

					if (!dracoGeometry) {
						const bufferViewDef = jsonDoc.json.bufferViews[dracoDef.bufferView];
						const bufferDef = jsonDoc.json.buffers[bufferViewDef.buffer];
						const resource = bufferDef.uri
							? jsonDoc.resources[bufferDef.uri]
							: jsonDoc.resources[GLB_BUFFER];

						const byteOffset = bufferViewDef.byteOffset || 0;
						const byteLength = bufferViewDef.byteLength;
						const compressedData = new Uint8Array(resource, byteOffset, byteLength);

						this.doc.getLogger().info(`Decompressing ${compressedData.byteLength} bytes...`);
						dracoGeometry = decodeGeometry(compressedData, decoder);
						dracoGeometries.set(dracoDef.bufferView, dracoGeometry);
					}

					// Attributes.
					for (const semantic in primDef.attributes) {
						const accessorDef = context.jsonDoc.json.accessors[primDef.attributes[semantic]];
						const dracoAttribute = decoder.GetAttributeByUniqueId(dracoGeometry, dracoDef.attributes[semantic]);
						const componentType = componentTypeToArray(accessorDef.componentType);
						const attributeArray = decodeAttribute(decoder, dracoGeometry, componentType, dracoAttribute);
						context.accessors[primDef.attributes[semantic]].setArray(attributeArray);
					}

					// Index.
					const indicesArray = decodeIndex(decoder, dracoGeometry);
					context.accessors[primDef.indices].setArray(indicesArray);
				}
			}

			decoderModule.destroy(decoder);
			for (const dracoGeometry of Array.from(dracoGeometries.values())) {
				decoderModule.destroy(dracoGeometry);
			}
		}
		context.jsonDoc.json.textures.forEach((textureDef) => {
			if (textureDef.extensions && textureDef.extensions[NAME]) {
				textureDef.source = textureDef.extensions[NAME].source;
			}
		});
		return this;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public read(context: ReaderContext): this {
		return this;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public write(context: WriterContext): this {
		throw new Error('Not implemented.');
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decodeGeometry(arrayBuffer: ArrayBuffer, decoder): any {
	let buffer;
	try {
		buffer = new decoderModule.DecoderBuffer();
		buffer.Init(new Int8Array(arrayBuffer), arrayBuffer.byteLength);
		const geometryType = decoder.GetEncodedGeometryType(buffer);

		if (geometryType !== decoderModule.TRIANGULAR_MESH) {
			throw new Error('Unknown geometry type.');
		}

		const dracoGeometry = new decoderModule.Mesh();
		const status = decoder.DecodeBufferToMesh(buffer, dracoGeometry);

		if (!status.ok() || dracoGeometry.ptr === 0) {
			throw new Error('Decoding failure.');
		}

		return dracoGeometry;
	} finally {
		decoderModule.destroy(buffer);
	}
}

function decodeIndex(decoder, dracoGeometry: DracoGeometry) {
	const numFaces = dracoGeometry.num_faces();
	const numIndices = numFaces * 3;
	const index = new Uint32Array( numIndices );
	const dracoIndex = new decoderModule.DracoInt32Array();

	for ( let i = 0; i < numFaces; ++ i ) {

		decoder.GetFaceFromMesh( dracoGeometry, i, dracoIndex );

		for ( let j = 0; j < 3; ++ j ) {

			index[ i * 3 + j ] = dracoIndex.GetValue( j );

		}

	}

	decoderModule.destroy( dracoIndex );

	return index;
}

function decodeAttribute(decoder, dracoGeometry: DracoGeometry, attributeType, attribute) {
	const numComponents = attribute.num_components();
	console.log(`attribute: ${attributeType.constructor.name}, numComponents: ${numComponents}`);
	const numPoints = dracoGeometry.num_points();
	const numValues = numPoints * numComponents;
	let dracoArray;

	let array;

	switch ( attributeType ) {

		case Float32Array:
			dracoArray = new decoderModule.DracoFloat32Array();
			decoder.GetAttributeFloatForAllPoints( dracoGeometry, attribute, dracoArray );
			array = new Float32Array( numValues );
			break;

		case Int8Array:
			dracoArray = new decoderModule.DracoInt8Array();
			decoder.GetAttributeInt8ForAllPoints( dracoGeometry, attribute, dracoArray );
			array = new Int8Array( numValues );
			break;

		case Int16Array:
			dracoArray = new decoderModule.DracoInt16Array();
			decoder.GetAttributeInt16ForAllPoints( dracoGeometry, attribute, dracoArray );
			array = new Int16Array( numValues );
			break;

		case Int32Array:
			dracoArray = new decoderModule.DracoInt32Array();
			decoder.GetAttributeInt32ForAllPoints( dracoGeometry, attribute, dracoArray );
			array = new Int32Array( numValues );
			break;

		case Uint8Array:
			dracoArray = new decoderModule.DracoUInt8Array();
			decoder.GetAttributeUInt8ForAllPoints( dracoGeometry, attribute, dracoArray );
			array = new Uint8Array( numValues );
			break;

		case Uint16Array:
			dracoArray = new decoderModule.DracoUInt16Array();
			decoder.GetAttributeUInt16ForAllPoints( dracoGeometry, attribute, dracoArray );
			array = new Uint16Array( numValues );
			break;

		case Uint32Array:
			dracoArray = new decoderModule.DracoUInt32Array();
			decoder.GetAttributeUInt32ForAllPoints( dracoGeometry, attribute, dracoArray );
			array = new Uint32Array( numValues );
			break;

		default:
			throw new Error( 'THREE.DRACOLoader: Unexpected attribute type.' );

	}

	for ( let i = 0; i < numValues; i ++ ) {

		array[ i ] = dracoArray.GetValue( i );

	}

	decoderModule.destroy( dracoArray );

	return array;
}

function componentTypeToArray (componentType: GLTF.AccessorComponentType) {
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
