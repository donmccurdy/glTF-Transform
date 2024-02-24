import { Format, GLB_BUFFER, VertexLayout } from '../constants.js';
import type { Document } from '../document.js';
import type { Extension } from '../extension.js';
import type { JSONDocument } from '../json-document.js';
import type { GLTF } from '../types/gltf.js';
import { BufferUtils, FileUtils, ILogger, Logger, uuid } from '../utils/index.js';
import { GLTFReader } from './reader.js';
import { GLTFWriter, WriterOptions } from './writer.js';

enum ChunkType {
	JSON = 0x4e4f534a,
	BIN = 0x004e4942,
}

type PublicWriterOptions = Partial<Pick<WriterOptions, 'format' | 'basename'>>;

/**
 * *Abstract I/O service.*
 *
 * The most common use of the I/O service is to read/write a {@link Document} with a given path.
 * Methods are also available for converting in-memory representations of raw glTF files, both
 * binary (*Uint8Array*) and JSON ({@link JSONDocument}).
 *
 * For platform-specific implementations, see {@link NodeIO}, {@link WebIO}, and {@link DenoIO}.
 *
 * @category I/O
 */
export abstract class PlatformIO {
	protected _logger: ILogger = Logger.DEFAULT_INSTANCE;
	private _extensions = new Set<typeof Extension>();
	private _dependencies: { [key: string]: unknown } = {};
	private _vertexLayout = VertexLayout.INTERLEAVED;

	/** @hidden */
	public lastReadBytes = 0;

	/** @hidden */
	public lastWriteBytes = 0;

	/** Sets the {@link Logger} used by this I/O instance. Defaults to Logger.DEFAULT_INSTANCE. */
	public setLogger(logger: ILogger): this {
		this._logger = logger;
		return this;
	}

	/** Registers extensions, enabling I/O class to read and write glTF assets requiring them. */
	public registerExtensions(extensions: (typeof Extension)[]): this {
		for (const extension of extensions) {
			this._extensions.add(extension);
			extension.register();
		}
		return this;
	}

	/** Registers dependencies used (e.g. by extensions) in the I/O process. */
	public registerDependencies(dependencies: { [key: string]: unknown }): this {
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
	 * Abstract.
	 */

	protected abstract readURI(uri: string, type: 'view'): Promise<Uint8Array>;
	protected abstract readURI(uri: string, type: 'text'): Promise<string>;
	protected abstract readURI(uri: string, type: 'view' | 'text'): Promise<Uint8Array | string>;

	protected abstract resolve(base: string, path: string): string;
	protected abstract dirname(uri: string): string;

	/**********************************************************************************************
	 * Public Read API.
	 */

	/** Reads a {@link Document} from the given URI. */
	public async read(uri: string): Promise<Document> {
		return await this.readJSON(await this.readAsJSON(uri));
	}

	/** Loads a URI and returns a {@link JSONDocument} struct, without parsing. */
	public async readAsJSON(uri: string): Promise<JSONDocument> {
		const view = await this.readURI(uri, 'view');
		this.lastReadBytes = view.byteLength;
		const jsonDoc = isGLB(view)
			? this._binaryToJSON(view)
			: { json: JSON.parse(BufferUtils.decodeText(view)), resources: {} };
		// Read external resources first, before Data URIs are replaced.
		await this._readResourcesExternal(jsonDoc, this.dirname(uri));
		this._readResourcesInternal(jsonDoc);
		return jsonDoc;
	}

	/** Converts glTF-formatted JSON and a resource map to a {@link Document}. */
	public async readJSON(jsonDoc: JSONDocument): Promise<Document> {
		jsonDoc = this._copyJSON(jsonDoc);
		this._readResourcesInternal(jsonDoc);
		return GLTFReader.read(jsonDoc, {
			extensions: Array.from(this._extensions),
			dependencies: this._dependencies,
			logger: this._logger,
		});
	}

	/** Converts a GLB-formatted Uint8Array to a {@link JSONDocument}. */
	public async binaryToJSON(glb: Uint8Array): Promise<JSONDocument> {
		const jsonDoc = this._binaryToJSON(BufferUtils.assertView(glb));
		this._readResourcesInternal(jsonDoc);
		this._assertResources(jsonDoc);
		return jsonDoc;
	}

	/** Converts glTF-formatted JSON and a resource map to a GLB-formatted Uint8Array. */
	public async jsonToBinary(jsonDoc: JSONDocument): Promise<Uint8Array> {
		jsonDoc = this._copyJSON(jsonDoc);
		this._readResourcesInternal(jsonDoc);
		this._assertResources(jsonDoc);

		const { json, resources } = jsonDoc;

		if (!json.buffers || json.buffers.length <= 1) {
			return this._jsonToBinary(jsonDoc);
		}

		const buffers = json.buffers;
		const bufferViews = json.bufferViews || [];

		const glbBufferIndex = buffers.findIndex(({ uri }) => !!uri);
		const glbBufferResources: Uint8Array[] = [];

		let byteOffset = 0;
		const bufferByteOffsets = new Uint32Array(buffers.length);
		const bufferHasContent = new Uint8Array(buffers.length); // 1 = content , 0 = fallback

		// Iterate over buffers, adding everything with a URI to the GLB buffer,
		// and ignoring fallback buffers without URIs.
		for (let bufferIndex = 0; bufferIndex < buffers.length; bufferIndex++) {
			const buffer = buffers[bufferIndex];

			if (!buffer.uri) {
				continue; // fallback buffer
			}

			bufferByteOffsets[bufferIndex] = byteOffset;
			bufferHasContent[bufferIndex] = 1;
			glbBufferResources.push(resources[buffer.uri]);
			delete resources[buffer.uri];

			byteOffset += buffer.byteLength;
		}

		// Update buffer view byte offsets.
		for (const bufferView of bufferViews) {
			if (bufferView.byteOffset === undefined) continue;
			if (!bufferHasContent[bufferView.buffer]) continue;
			bufferView.byteOffset += bufferByteOffsets[bufferView.buffer];
			bufferView.buffer = glbBufferIndex;
		}

		// Add all images to GLB buffer.
		for (const image of json.images || []) {
			if (!image.uri) {
				continue;
			}

			const resource = resources[image.uri];
			const paddedResource = BufferUtils.pad(resource);

			bufferViews.push({
				buffer: glbBufferIndex,
				byteOffset: byteOffset,
				byteLength: resource.byteLength,
			});

			image.bufferView = bufferViews.length - 1;

			delete resources[image.uri];
			delete image.uri;

			glbBufferResources.push(paddedResource);
			byteOffset += paddedResource.byteLength;
		}

		// Remove non-fallback buffers.
		json.buffers = buffers.filter((buffer, index) => !buffer.uri || index === glbBufferIndex);
		json.bufferViews = bufferViews.length ? bufferViews : undefined;

		delete json.buffers[glbBufferIndex].uri;
		resources[GLB_BUFFER] = BufferUtils.concat(glbBufferResources);

		return this._jsonToBinary({ json, resources });
	}

	/** Converts a GLB-formatted Uint8Array to a {@link Document}. */
	public async readBinary(glb: Uint8Array): Promise<Document> {
		return this.readJSON(await this.binaryToJSON(BufferUtils.assertView(glb)));
	}

	/**********************************************************************************************
	 * Public Write API.
	 */

	/** Converts a {@link Document} to glTF-formatted JSON and a resource map. */
	public async writeJSON(doc: Document, _options: PublicWriterOptions = {}): Promise<JSONDocument> {
		if (_options.format === Format.GLB && doc.getRoot().listBuffers().length > 1) {
			throw new Error('GLB must have 0–1 buffers.');
		}
		return GLTFWriter.write(doc, {
			format: _options.format || Format.GLTF,
			basename: _options.basename || '',
			logger: this._logger,
			vertexLayout: this._vertexLayout,
			dependencies: { ...this._dependencies },
			extensions: Array.from(this._extensions),
		} as Required<WriterOptions>);
	}

	/** Converts a {@link Document} to a GLB-formatted Uint8Array. */
	public async writeBinary(doc: Document): Promise<Uint8Array> {
		return this._jsonToBinary(await this.writeJSON(doc, { format: Format.GLB }));
	}

	/**********************************************************************************************
	 * Internal.
	 */

	/** Check for external references, which can't be resolved by some API surfaces. */
	private _assertResources(jsonDoc: JSONDocument) {
		const { buffers, images } = jsonDoc.json;
		const hasExternalBuffer = buffers && buffers.some((bufferDef) => isExternalBuffer(jsonDoc, bufferDef));
		const hasExternalImage = images && images.some((imageDef) => isExternalImage(jsonDoc, imageDef));
		if (hasExternalBuffer || hasExternalImage) {
			throw new Error('Cannot resolve external buffers and images.');
		}
	}

	private async _readResourcesExternal(jsonDoc: JSONDocument, base: string): Promise<void> {
		const images = jsonDoc.json.images || [];
		const buffers = jsonDoc.json.buffers || [];
		const pendingResources: Array<Promise<void>> = [...images, ...buffers].map(
			async (resource: GLTF.IBuffer | GLTF.IImage): Promise<void> => {
				const uri = resource.uri;
				if (!uri || uri.match(/data:/)) return Promise.resolve();

				// TODO(v4): Perhaps the resources dictionary could have been keyed by decoded URIs
				// like "my image.png" instead of "my%20image.png". But for now, we use the URIs
				// verbatim as found in resource definition. Consider revisiting in v4.
				jsonDoc.resources[uri] = await this.readURI(this.resolve(base, uri), 'view');
				this.lastReadBytes += jsonDoc.resources[uri].byteLength;
			},
		);
		await Promise.all(pendingResources);
	}

	private _readResourcesInternal(jsonDoc: JSONDocument): void {
		// NOTICE: This method may be called more than once during the loading
		// process (e.g. WebIO.read) and should handle that safely.

		function resolveResource(resource: GLTF.IBuffer | GLTF.IImage) {
			if (!resource.uri) return;

			if (resource.uri in jsonDoc.resources) {
				BufferUtils.assertView(jsonDoc.resources[resource.uri]);
				return;
			}

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

	/**
	 * Creates a shallow copy of glTF-formatted {@link JSONDocument}.
	 *
	 * Images, Buffers, and Resources objects are deep copies so that PlatformIO can safely
	 * modify them during the parsing process. Other properties are shallow copies, and buffers
	 * are passed by reference.
	 */
	private _copyJSON(jsonDoc: JSONDocument): JSONDocument {
		const { images, buffers } = jsonDoc.json;

		jsonDoc = { json: { ...jsonDoc.json }, resources: { ...jsonDoc.resources } };

		if (images) {
			jsonDoc.json.images = images.map((image) => ({ ...image }));
		}
		if (buffers) {
			jsonDoc.json.buffers = buffers.map((buffer) => ({ ...buffer }));
		}

		return jsonDoc;
	}

	/** Internal version of binaryToJSON; does not warn about external resources. */
	private _binaryToJSON(glb: Uint8Array): JSONDocument {
		// Decode and verify GLB header.
		if (!isGLB(glb)) {
			throw new Error('Invalid glTF 2.0 binary.');
		}

		// Decode JSON chunk.

		const jsonChunkHeader = new Uint32Array(glb.buffer, glb.byteOffset + 12, 2);
		if (jsonChunkHeader[1] !== ChunkType.JSON) {
			throw new Error('Missing required GLB JSON chunk.');
		}

		const jsonByteOffset = 20;
		const jsonByteLength = jsonChunkHeader[0];
		const jsonText = BufferUtils.decodeText(BufferUtils.toView(glb, jsonByteOffset, jsonByteLength));
		const json = JSON.parse(jsonText) as GLTF.IGLTF;

		// Decode BIN chunk.

		const binByteOffset = jsonByteOffset + jsonByteLength;
		if (glb.byteLength <= binByteOffset) {
			return { json, resources: {} };
		}

		const binChunkHeader = new Uint32Array(glb.buffer, glb.byteOffset + binByteOffset, 2);
		if (binChunkHeader[1] !== ChunkType.BIN) {
			throw new Error('Expected GLB BIN in second chunk.');
		}

		const binByteLength = binChunkHeader[0];
		const binBuffer = BufferUtils.toView(glb, binByteOffset + 8, binByteLength);

		return { json, resources: { [GLB_BUFFER]: binBuffer } };
	}

	/** Internal implementation of jsonToBinary; expects 0–1 buffers. */
	private _jsonToBinary(jsonDoc: JSONDocument): Uint8Array {
		const { json, resources } = jsonDoc;
		const header = new Uint32Array([0x46546c67, 2, 12]);

		const jsonText = JSON.stringify(json);
		const jsonChunkData = BufferUtils.pad(BufferUtils.encodeText(jsonText), 0x20);
		const jsonChunkHeader = BufferUtils.toView(new Uint32Array([jsonChunkData.byteLength, 0x4e4f534a]));
		const jsonChunk = BufferUtils.concat([jsonChunkHeader, jsonChunkData]);
		header[header.length - 1] += jsonChunk.byteLength;

		const binBuffer = Object.values(resources)[0];
		if (!binBuffer || !binBuffer.byteLength) {
			return BufferUtils.concat([BufferUtils.toView(header), jsonChunk]);
		}

		const binChunkData = BufferUtils.pad(binBuffer, 0x00);
		const binChunkHeader = BufferUtils.toView(new Uint32Array([binChunkData.byteLength, 0x004e4942]));
		const binChunk = BufferUtils.concat([binChunkHeader, binChunkData]);
		header[header.length - 1] += binChunk.byteLength;

		return BufferUtils.concat([BufferUtils.toView(header), jsonChunk, binChunk]);
	}
}

function isExternalBuffer(jsonDocument: JSONDocument, bufferDef: GLTF.IBuffer): boolean {
	return bufferDef.uri !== undefined && !(bufferDef.uri in jsonDocument.resources);
}

function isExternalImage(jsonDocument: JSONDocument, imageDef: GLTF.IImage): boolean {
	return imageDef.uri !== undefined && !(imageDef.uri in jsonDocument.resources) && imageDef.bufferView === undefined;
}

function isGLB(view: Uint8Array): boolean {
	if (view.byteLength < 3 * Uint32Array.BYTES_PER_ELEMENT) return false;
	const header = new Uint32Array(view.buffer, view.byteOffset, 3);
	return header[0] === 0x46546c67 && header[1] === 2;
}
