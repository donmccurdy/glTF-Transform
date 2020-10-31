import { DRACO } from '../types/draco3d';

export let encoderModule: DRACO.EncoderModule;

export enum EncoderMethod {
	EDGEBREAKER = 1,
	SEQUENTIAL = 0,
}

interface EncoderOptions {
	decodeSpeed?: number;
	encodeSpeed?: number;
	encodeMethod?: EncoderMethod;
	encodeQuantization?: number[];
}

const DEFAULT_ENCODER_OPTIONS: EncoderOptions = {
	decodeSpeed: 5,
	encodeSpeed: 5,
	encodeMethod: EncoderMethod.EDGEBREAKER,
	encodeQuantization: [ 16, 8, 8, 8, 8 ],
}

export function initEncoderModule (_encoderModule: DRACO.EncoderModule): void {
	encoderModule = _encoderModule;
}

/** References:
 * - https://github.com/mrdoob/three.js/blob/dev/examples/js/exporters/DRACOExporter.js
 * - https://github.com/CesiumGS/gltf-pipeline/blob/master/lib/compressDracoMeshes.js
 */
export function encodeGeometry (options: EncoderOptions = DEFAULT_ENCODER_OPTIONS) {
	options = {...DEFAULT_ENCODER_OPTIONS, ...options};

	const encoder = new encoderModule.Encoder();
	const builder = new encoderModule.MeshBuilder();
	const mesh = new encoderModule.Mesh();

	// var vertices = geometry.getAttribute( 'position' );
	// builder.AddFloatAttributeToMesh( mesh, encoderModule.POSITION, vertices.count, vertices.itemSize, vertices.array );

	// var faces = geometry.getIndex();

	// if ( faces !== null ) {

	// 	builder.AddFacesToMesh( mesh, faces.count / 3, faces.array );

	// } else {

	// 	var faces = new ( vertices.count > 65535 ? Uint32Array : Uint16Array )( vertices.count );

	// 	for ( var i = 0; i < faces.length; i ++ ) {

	// 		faces[ i ] = i;

	// 	}

	// 	builder.AddFacesToMesh( mesh, vertices.count, faces );

	// }

	// if ( options.exportNormals === true ) {

	// 	var normals = geometry.getAttribute( 'normal' );

	// 	if ( normals !== undefined ) {

	// 		builder.AddFloatAttributeToMesh( mesh, encoderModule.NORMAL, normals.count, normals.itemSize, normals.array );

	// 	}

	// }

	// if ( options.exportUvs === true ) {

	// 	var uvs = geometry.getAttribute( 'uv' );

	// 	if ( uvs !== undefined ) {

	// 		builder.AddFloatAttributeToMesh( mesh, encoderModule.TEX_COORD, uvs.count, uvs.itemSize, uvs.array );

	// 	}

	// }

	// if ( options.exportColor === true ) {

	// 	var colors = geometry.getAttribute( 'color' );

	// 	if ( colors !== undefined ) {

	// 		builder.AddFloatAttributeToMesh( mesh, encoderModule.COLOR, colors.count, colors.itemSize, colors.array );

	// 	}

	// }

	// //Compress using draco encoder

	// var encodedData = new encoderModule.DracoInt8Array();

	// //Sets the desired encoding and decoding speed for the given options from 0 (slowest speed, but the best compression) to 10 (fastest, but the worst compression).

	// encoder.SetSpeedOptions( options.encodeSpeed || 5, options.decodeSpeed || 5 );

	// // Sets the desired encoding method for a given geometry.

	// if ( options.encoderMethod !== undefined ) {

	// 	encoder.SetEncodingMethod( options.encoderMethod );

	// }

	// // Sets the quantization (number of bits used to represent) compression options for a named attribute.
	// // The attribute values will be quantized in a box defined by the maximum extent of the attribute values.
	// if ( options.quantization !== undefined ) {

	// 	for ( var i = 0; i < 5; i ++ ) {

	// 		if ( options.quantization[ i ] !== undefined ) {

	// 			encoder.SetAttributeQuantization( i, options.quantization[ i ] );

	// 		}

	// 	}

	// }

	// var length = encoder.EncodeMeshToDracoBuffer( mesh, encodedData );
	// encoderModule.destroy( mesh );

	// if ( length === 0 ) {

	// 	throw new Error( 'THREE.DRACOExporter: Draco encoding failed.' );

	// }

	// //Copy encoded data to buffer.
	// var outputData = new Int8Array( new ArrayBuffer( length ) );

	// for ( var i = 0; i < length; i ++ ) {

	// 	outputData[ i ] = encodedData.GetValue( i );

	// }

	// encoderModule.destroy( encodedData );
	// encoderModule.destroy( encoder );
	// encoderModule.destroy( builder );

	// return outputData;
}
