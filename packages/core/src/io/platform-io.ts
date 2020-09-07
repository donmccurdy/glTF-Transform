import { GLB_BUFFER } from '../constants';
import { Document } from '../document';
import { Extension } from '../extension';
import { JSONDocument } from '../json-document';
import { BufferUtils, Logger } from '../utils/';
import { GLTFReader } from './reader';
import { GLTFWriter, WriterOptions } from './writer';

/**
 * # PlatformIO
 *
 * *Abstract I/O service.*
 *
 * For platform-specific implementations, see {@link NodeIO} and {@link WebIO}.
 *
 * @category I/O
 */
export abstract class PlatformIO {

	protected _logger = Logger.DEFAULT_INSTANCE;

	protected _extensions: typeof Extension[] = [];

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

	/**********************************************************************************************
	 * JSON.
	 */

	/** Converts glTF-formatted JSON and a resource map to a {@link Document}. */
	public readJSON (jsonDoc: JSONDocument): Document {
		return GLTFReader.read(jsonDoc, {extensions: this._extensions, logger: this._logger});
	}

	/** Converts a {@link Document} to glTF-formatted JSON and a resource map. */
	public writeJSON (doc: Document, options: WriterOptions): JSONDocument {
		if (options.isGLB && doc.getRoot().listBuffers().length !== 1) {
			throw new Error('GLB must have exactly 1 buffer.');
		}
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
		});

		const jsonText = JSON.stringify(json);
		const jsonChunkData = BufferUtils.pad( BufferUtils.encodeText(jsonText), 0x20 );
		const jsonChunkHeader = new Uint32Array([jsonChunkData.byteLength, 0x4E4F534A]).buffer;
		const jsonChunk = BufferUtils.concat([jsonChunkHeader, jsonChunkData]);

		const binaryChunkData = BufferUtils.pad(Object.values(resources)[0] || new ArrayBuffer(0), 0x00);
		const binaryChunkHeader = new Uint32Array([binaryChunkData.byteLength, 0x004E4942]).buffer;
		const binaryChunk = BufferUtils.concat([binaryChunkHeader, binaryChunkData]);

		const header = new Uint32Array([
			0x46546C67, 2, 12 + jsonChunk.byteLength + binaryChunk.byteLength
		]).buffer;

		return BufferUtils.concat([header, jsonChunk, binaryChunk]);
	}
}
