import { Accessor, Buffer, Extension, GLB_BUFFER, GLTF, PropertyType, ReaderContext, WriterContext } from '@gltf-transform/core';
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

interface MeshoptBufferExtension {
	fallback?: boolean;
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
	public readonly prereadTypes = [PropertyType.BUFFER, PropertyType.PRIMITIVE];

	public static readonly EXTENSION_NAME = NAME;

	private _fallbackBufferMap = new Map<Buffer, Buffer>();

	public preread(context: ReaderContext, propertyType: PropertyType): this {
		if (!MeshoptDecoder.supported) {
			if (!this.isRequired()) return this;
			throw new Error(`[${NAME}]: Missing WASM support.`);
		}

		if (!MeshoptDecoder.ready) {
			if (!this.isRequired()) return this;
			throw new Error(`[${NAME}]: Decoder not ready.`);
		}

		if (propertyType === PropertyType.BUFFER) {
			this._beforeBuffers(context);
		} else if (propertyType === PropertyType.PRIMITIVE) {
			this._beforePrimitives(context);
		}

		return this;
	}

	/** Decode buffer views. */
	private _beforeBuffers(context: ReaderContext): void {
		const jsonDoc = context.jsonDoc;

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
	}

	/**
	 * Mark fallback buffers and replacements.
	 *
	 * Note: Alignment with primitives is arbitrary; this just needs to happen
	 * after Buffers have been parsed.
	 */
	private _beforePrimitives(context: ReaderContext): void {
		const jsonDoc = context.jsonDoc;
		const viewDefs = jsonDoc.json.bufferViews || [];

		//
		viewDefs.forEach((viewDef) => {
			if (!viewDef.extensions || !viewDef.extensions[NAME]) return;

			const meshoptDef = viewDef.extensions[NAME] as MeshoptBufferViewExtension;

			const buffer = context.buffers[meshoptDef.buffer];
			const fallbackBuffer = context.buffers[viewDef.buffer];
			const fallbackBufferDef = jsonDoc.json.buffers![viewDef.buffer];
			if (isFallbackBuffer(fallbackBufferDef)) {
				this._fallbackBufferMap.set(fallbackBuffer, buffer);
			}
		});
	}

	public read(_context: ReaderContext): this {
		// Writes aren't implemented, so remove extension after unpacking.
		this.dispose();

		if (!this.isRequired()) return this;

		// Replace fallback buffers.
		for (const [fallbackBuffer, buffer] of this._fallbackBufferMap) {
			for (const parent of fallbackBuffer.listParents()) {
				if (parent instanceof Accessor) {
					parent.swap(fallbackBuffer, buffer);
				}
			}
			fallbackBuffer.dispose();
		}

		return this;
	}

	public write(_context: WriterContext): this {
		this.doc.getLogger().warn(`Writing ${this.extensionName} not yet implemented.`);
		return this;
	}
}

/**
 * Returns true for a fallback buffer, else false.
 *
 *   - All references to the fallback buffer must come from bufferViews that
 *     have a EXT_meshopt_compression extension specified.
 *   - No references to the fallback buffer may come from
 *     EXT_meshopt_compression extension JSON.
 */
function isFallbackBuffer(bufferDef: GLTF.IBuffer): boolean {
	if (!bufferDef.extensions || !bufferDef.extensions[NAME]) return false;
	const fallbackDef = bufferDef.extensions[NAME] as MeshoptBufferExtension;
	return !!fallbackDef.fallback;
}
