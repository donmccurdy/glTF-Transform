import { Extension, GLB_BUFFER, PropertyType, ReaderContext, WriterContext } from '@gltf-transform/core';
import { EXT_MESHOPT_COMPRESSION } from '../constants';
import { MeshoptDecoder } from '../../vendor/meshopt_decoder.module';

const NAME = EXT_MESHOPT_COMPRESSION;

enum MeshoptMode {
	ATTRIBUTES = 'ATTRIBUTES',
	TRIANGLES = 'TRIANGLES',
	INDICES = 'INDICES',
}

enum MeshoptFilter {
	NONE = 'NONE',
	OCTAHEDRAL = 'OCTAHEDRAL',
	QUATERNION = 'QUATERNION',
	EXPONENTIAL = 'EXPONENTIAL',
}

interface MeshoptBufferViewExtension {
	buffer: number;
	byteOffset: number;
	byteLength: number;
	byteStride: number;
	count: number;
	mode: MeshoptMode;
	filter?: MeshoptFilter;
}

/**
 * # MeshoptCompression
 *
 * [`EXT_meshopt_compression`](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Vendor/EXT_meshopt_compression/)
 * provides compression and fast decoding for mesh geometry, morph targets, and animation data.
 *
 * TODO(DO NOT SUBMIT): Fill out documentation below.
 *
 *
 */
export class MeshoptCompression extends Extension {
	public readonly extensionName = NAME;
	public readonly prereadTypes = [PropertyType.BUFFER];

	public static readonly EXTENSION_NAME = NAME;

	public preread(context: ReaderContext): this {
		if (!MeshoptDecoder.supported) {
			if (!this.isRequired()) return this;
			throw new Error(`[${NAME}]: Missing WASM support.`);
		}

		if (!MeshoptDecoder.ready) {
			if (!this.isRequired()) return this;
			throw new Error(`[${NAME}]: Decoder not ready.`);
		}

		const jsonDoc = context.jsonDoc;

		// Decode buffer views.
		const viewDefs = jsonDoc.json.bufferViews || [];
		viewDefs.forEach((viewDef, index) => {
			if (!viewDef.extensions || !viewDef.extensions[NAME]) return;

			const meshoptDef = viewDef.extensions[NAME] as MeshoptBufferViewExtension;
			const byteOffset = meshoptDef.byteOffset || 0;
			const byteLength = meshoptDef.byteLength || 0;
			const count = meshoptDef.count;
			const stride = meshoptDef.byteStride;
			const result = new Uint8Array(new ArrayBuffer(count * stride));

			const bufferDef = jsonDoc.json.buffers![viewDef.buffer];
			const resource = bufferDef.uri
				? jsonDoc.resources[bufferDef.uri]
				: jsonDoc.resources[GLB_BUFFER];
			const source = new Uint8Array(resource, byteOffset, byteLength);

			MeshoptDecoder.decodeGltfBuffer(
				result, count, stride, source, meshoptDef.mode, meshoptDef.filter
			);

			context.bufferViews[index] = result;
		});

		return this;
	}

	public read(_context: ReaderContext): this {
		this.dispose(); // Writes aren't implemented, so remove extension after unpacking.
		return this;
	}

	public write(_context: WriterContext): this {
		this.doc.getLogger().warn(`Writing ${this.extensionName} not yet implemented.`);
		return this;
	}
}
