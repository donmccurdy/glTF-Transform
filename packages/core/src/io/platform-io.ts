import { GLB_BUFFER } from '../constants';
import { Document } from '../document';
import { Extension } from '../extension';
import { JSONDocument } from '../json-document';
import { GLTF } from '../types/gltf';
import { BufferUtils, Logger } from '../utils/';
import { GLTFReader } from './reader';
import { GLTFWriter, WriterOptions } from './writer';

/**
 * # PlatformIO
 *
 * *Abstract I/O service.*
 *
 * The most common use of the I/O service is to read/write a {@link Document} with a given path.
 * Methods are also available for converting in-memory representations of raw glTF files, both
 * binary (*ArrayBuffer*) and JSON ({@link JSONDocument}).
 *
 * For platform-specific implementations, see {@link NodeIO} and {@link WebIO}.
 *
 * @category I/O
 */
export abstract class PlatformIO {

	protected _logger = Logger.DEFAULT_INSTANCE;
	protected _extensions: typeof Extension[] = [];
	protected _dependencies: {[key: string]: unknown} = {};

	/** Sets the {@link Logger} used by this I/O instance. Defaults to Logger.DEFAULT_INSTANCE. */
	public setLogger(logger: Logger): this {
		this._logger = logger;
		return this;
	}

	/** Registers extensions, enabling I/O class to read and write glTF assets requiring them. */
	public registerExtensions(extensions: typeof Extension[]): this {
		this._extensions.push(...extensions);
		return this;
	}

	/** Registers dependencies used (e.g. by extensions) in the I/O process. */
	public registerDependencies(dependencies: {[key: string]: unknown}): this {
		Object.assign(this._dependencies, dependencies);
		return this;
	}

	/**********************************************************************************************
	 * JSON.
	 */

	/** Converts glTF-formatted JSON and a resource map to a {@link Document}. */
	public readJSON (jsonDoc: JSONDocument): Document {
		return GLTFReader.read(jsonDoc, {
			extensions: this._extensions,
			dependencies: this._dependencies,
			logger: this._logger
		});
	}

	/** Converts a {@link Document} to glTF-formatted JSON and a resource map. */
	public writeJSON (doc: Document, options: WriterOptions): JSONDocument {
		if (options.isGLB && doc.getRoot().listBuffers().length !== 1) {
			throw new Error('GLB must have exactly 1 buffer.');
		}
		options.dependencies = {...this._dependencies, ...options.dependencies};
		return GLTFWriter.write(doc, options);
	}

	/**********************************************************************************************
	 * Binary -> JSON.
	 */

	/** Converts a GLB-formatted ArrayBuffer to a {@link JSONDocument}. */
	public binaryToJSON(glb: ArrayBuffer): JSONDocument {
		// Decode and verify GLB header.
		const header = new Uint32Array(glb, 0, 3);
		if (header[0] !== 0x46546C67) {
			throw new Error('Invalid glTF asset.');
		} else if (header[1] !== 2) {
			throw new Error(`Unsupported glTF binary version, "${header[1]}".`);
		}

		// Decode and verify chunk headers.
		const jsonChunkHeader = new Uint32Array(glb, 12, 2);
		const jsonByteOffset = 20;
		const jsonByteLength = jsonChunkHeader[0];
		const binaryChunkHeader = new Uint32Array(glb, jsonByteOffset + jsonByteLength, 2);
		if (jsonChunkHeader[1] !== 0x4E4F534A || binaryChunkHeader[1] !== 0x004E4942) {
			throw new Error('Unexpected GLB layout.');
		}

		// Decode content.
		const jsonText = BufferUtils.decodeText(
			glb.slice(jsonByteOffset, jsonByteOffset + jsonByteLength)
		);
		const json = JSON.parse(jsonText) as GLTF.IGLTF;
		const binaryByteOffset = jsonByteOffset + jsonByteLength + 8;
		const binaryByteLength = binaryChunkHeader[0];
		const binary = glb.slice(binaryByteOffset, binaryByteOffset + binaryByteLength);

		// Check for external references, which currently aren't supported.
		if (json.buffers && json.buffers.length > 1) {
			throw new Error('GLB must have exactly 1 buffer.');
		} else if (json.images
				&& json.images.find((imageDef) => imageDef.bufferView === undefined)) {
			throw new Error('GLB images must be stored in a buffer view.');
		}

		return {json, resources: {[GLB_BUFFER]: binary}};
	}

	/**********************************************************************************************
	 * Binary.
	 */

	/** Converts a GLB-formatted ArrayBuffer to a {@link Document}. */
	public readBinary(glb: ArrayBuffer): Document {
		return this.readJSON(this.binaryToJSON(glb));
	}

	/** Converts a {@link Document} to a GLB-formatted ArrayBuffer. */
	public writeBinary(doc: Document): ArrayBuffer {
		const {json, resources} = this.writeJSON(doc, {
			basename: '',
			isGLB: true,
			logger: this._logger,
			dependencies: this._dependencies,
		});

		const jsonText = JSON.stringify(json);
		const jsonChunkData = BufferUtils.pad( BufferUtils.encodeText(jsonText), 0x20 );
		const jsonChunkHeader = new Uint32Array([jsonChunkData.byteLength, 0x4E4F534A]).buffer;
		const jsonChunk = BufferUtils.concat([jsonChunkHeader, jsonChunkData]);

		const binaryChunkData
			= BufferUtils.pad(Object.values(resources)[0] || new ArrayBuffer(0), 0x00);
		const binaryChunkHeader = new Uint32Array([binaryChunkData.byteLength, 0x004E4942]).buffer;
		const binaryChunk = BufferUtils.concat([binaryChunkHeader, binaryChunkData]);

		const header = new Uint32Array([
			0x46546C67, 2, 12 + jsonChunk.byteLength + binaryChunk.byteLength
		]).buffer;

		return BufferUtils.concat([header, jsonChunk, binaryChunk]);
	}
}
