import { Format, GLB_BUFFER, VertexLayout } from '../constants';
import { Document } from '../document';
import { Extension } from '../extension';
import { JSONDocument } from '../json-document';
import { GLTF } from '../types/gltf';
import { BufferUtils, FileUtils, Logger, uuid } from '../utils/';
import { GLTFReader } from './reader';
import { GLTFWriter, WriterOptions } from './writer';

enum ChunkType {
	JSON = 0x4E4F534A,
	BIN = 0x004E4942
}

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
	protected _vertexLayout = VertexLayout.INTERLEAVED;

	/** Sets the {@link Logger} used by this I/O instance. Defaults to Logger.DEFAULT_INSTANCE. */
	public setLogger(logger: Logger): this {
		this._logger = logger;
		return this;
	}

	/** Registers extensions, enabling I/O class to read and write glTF assets requiring them. */
	public registerExtensions(extensions: typeof Extension[]): this {
		for (const extension of extensions) {
			this._extensions.push(extension);
			extension.register();
		}
		return this;
	}

	/** Registers dependencies used (e.g. by extensions) in the I/O process. */
	public registerDependencies(dependencies: {[key: string]: unknown}): this {
		Object.assign(this._dependencies, dependencies);
		return this;
	}

	/**
	 * Sets the vertex layout method used by this I/O instance. Defaults to
	 * VertexLayout.INTERLEAVED.
	 */
	public setVertexLayout(layout: VertexLayout): this {
		this._vertexLayout = layout;
		return this;
	}

	/**********************************************************************************************
	 * Common.
	 */

	/** @internal */
	protected _readResourcesInternal(jsonDoc: JSONDocument): void {
		function resolveResource(resource: GLTF.IBuffer | GLTF.IImage) {
			if (!resource.uri || (resource.uri in jsonDoc.resources)) return;

			if (resource.uri.match(/data:/)) {
				// Rewrite Data URIs to something short and unique.
				const resourceUUID = `__${uuid()}.${FileUtils.extension(resource.uri)}`;
				jsonDoc.resources[resourceUUID] = BufferUtils.createBufferFromDataURI(resource.uri);
				resource.uri = resourceUUID;
			}
		}

		// Unpack images.
		const images = jsonDoc.json.images || [];
		images.forEach((image: GLTF.IImage) => {
			if (image.bufferView === undefined && image.uri === undefined) {
				throw new Error('Missing resource URI or buffer view.');
			}

			resolveResource(image);
		});

		// Unpack buffers.
		const buffers = jsonDoc.json.buffers || [];
		buffers.forEach(resolveResource);
	}

	/**********************************************************************************************
	 * JSON.
	 */

	/** Converts glTF-formatted JSON and a resource map to a {@link Document}. */
	public readJSON(jsonDoc: JSONDocument): Document {
		this._readResourcesInternal(jsonDoc);
		return GLTFReader.read(jsonDoc, {
			extensions: this._extensions,
			dependencies: this._dependencies,
			logger: this._logger
		});
	}

	/** Converts a {@link Document} to glTF-formatted JSON and a resource map. */
	public writeJSON(doc: Document, _options: Partial<WriterOptions> = {}): JSONDocument {
		if (_options.format === Format.GLB && doc.getRoot().listBuffers().length > 1) {
			throw new Error('GLB must have 0–1 buffers.');
		}
		return GLTFWriter.write(doc, {
			format: _options.format || Format.GLTF,
			logger: _options.logger || this._logger,
			vertexLayout: _options.vertexLayout || this._vertexLayout,
			dependencies: {...this._dependencies, ..._options.dependencies},
			basename: _options.basename || ''
		} as Required<WriterOptions>);
	}

	/**********************************************************************************************
	 * Binary -> JSON.
	 */

	/** Converts a GLB-formatted ArrayBuffer to a {@link JSONDocument}. */
	public binaryToJSON(glb: ArrayBuffer): JSONDocument {
		const jsonDoc = this._binaryToJSON(glb);
		const json = jsonDoc.json;

		// Check for external references, which can't be resolved by this method.
		if (json.buffers
				&& json.buffers.find((bufferDef) => bufferDef.uri !== undefined)) {
			throw new Error('Cannot resolve external buffers with binaryToJSON().');
		} else if (json.images
				&& json.images.find((imageDef) => imageDef.bufferView === undefined)) {
			throw new Error('Cannot resolve external images with binaryToJSON().');
		}

		return jsonDoc;
	}

	/** @internal For internal use by WebIO and NodeIO. Does not warn about external resources. */
	protected _binaryToJSON(glb: ArrayBuffer): JSONDocument {
		// Decode and verify GLB header.
		const header = new Uint32Array(glb, 0, 3);
		if (header[0] !== 0x46546C67) {
			throw new Error('Invalid glTF asset.');
		} else if (header[1] !== 2) {
			throw new Error(`Unsupported glTF binary version, "${header[1]}".`);
		}

		// Decode JSON chunk.

		const jsonChunkHeader = new Uint32Array(glb, 12, 2);
		if (jsonChunkHeader[1] !== ChunkType.JSON) {
			throw new Error('Missing required GLB JSON chunk.');
		}

		const jsonByteOffset = 20;
		const jsonByteLength = jsonChunkHeader[0];
		const jsonText = BufferUtils.decodeText(
			glb.slice(jsonByteOffset, jsonByteOffset + jsonByteLength)
		);
		const json = JSON.parse(jsonText) as GLTF.IGLTF;

		// Decode BIN chunk.

		const binByteOffset = jsonByteOffset + jsonByteLength;
		if (glb.byteLength <= binByteOffset) {
			return {json, resources: {}};
		}

		const binChunkHeader = new Uint32Array(glb, binByteOffset, 2);
		if (binChunkHeader[1] !== ChunkType.BIN) {
			throw new Error('Expected GLB BIN in second chunk.');
		}

		const binByteLength = binChunkHeader[0];
		const binBuffer = glb.slice(binByteOffset + 8, binByteOffset + 8 + binByteLength);

		return {json, resources: {[GLB_BUFFER]: binBuffer}};
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
			format: Format.GLB,
			basename: '',
			logger: this._logger,
			dependencies: this._dependencies,
			vertexLayout: this._vertexLayout,
		});

		const header = new Uint32Array([0x46546C67, 2, 12]);

		const jsonText = JSON.stringify(json);
		const jsonChunkData = BufferUtils.pad(BufferUtils.encodeText(jsonText), 0x20);
		const jsonChunkHeader = new Uint32Array([jsonChunkData.byteLength, 0x4E4F534A]).buffer;
		const jsonChunk = BufferUtils.concat([jsonChunkHeader, jsonChunkData]);
		header[header.length - 1] += jsonChunk.byteLength;

		const binBuffer = Object.values(resources)[0];
		if (!binBuffer || !binBuffer.byteLength) {
			return BufferUtils.concat([header.buffer, jsonChunk]);
		}

		const binChunkData = BufferUtils.pad(binBuffer, 0x00);
		const binChunkHeader = new Uint32Array([binChunkData.byteLength, 0x004E4942]).buffer;
		const binChunk = BufferUtils.concat([binChunkHeader, binChunkData]);
		header[header.length - 1] += binChunk.byteLength;

		return BufferUtils.concat([header.buffer, jsonChunk, binChunk]);
	}
}
