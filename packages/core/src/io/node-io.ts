import { Format } from '../constants';
import { Document } from '../document';
import { JSONDocument } from '../json-document';
import { GLTF } from '../types/gltf';
import { FileUtils } from '../utils/';
import { PlatformIO } from './platform-io';

/**
 * # NodeIO
 *
 * *I/O service for Node.js.*
 *
 * The most common use of the I/O service is to read/write a {@link Document} with a given path.
 * Methods are also available for converting in-memory representations of raw glTF files, both
 * binary (*ArrayBuffer*) and JSON ({@link JSONDocument}).
 *
 * Usage:
 *
 * ```typescript
 * const { NodeIO } = require('@gltf-transform/core');
 *
 * const io = new NodeIO();
 *
 * // Read.
 * let document;
 * document = await io.read('model.glb'); // → Document
 * document = await io.readBinary(glb);   // Uint8Array → Document
 *
 * // Write.
 * await io.write('model.glb', document);      // → void
 * const glb = await io.writeBinary(document); // Document → Uint8Array
 * ```
 *
 * @category I/O
 */
export class NodeIO extends PlatformIO {
	private _fs;
	private _path;

	/** @hidden */
	public lastReadBytes = 0;

	/** @hidden */
	public lastWriteBytes = 0;

	/** Constructs a new NodeIO service. Instances are reusable. */
	constructor() {
		super();
		// Excluded from browser builds with 'package.browser' field.
		this._fs = require('fs/promises');
		this._path = require('path');
	}

	/**********************************************************************************************
	 * Public.
	 */

	/** Loads a local path and returns a {@link Document} instance. */
	public async read(uri: string): Promise<Document> {
		return await this.readJSON(await this.readAsJSON(uri));
	}

	/** Loads a local path and returns a {@link JSONDocument} struct, without parsing. */
	public async readAsJSON(uri: string): Promise<JSONDocument> {
		const isGLB = !!(uri.match(/\.glb$/) || uri.match(/^data:application\/octet-stream;/));
		return isGLB ? this._readGLB(uri) : this._readGLTF(uri);
	}

	/** Writes a {@link Document} instance to a local path. */
	public async write(uri: string, doc: Document): Promise<void> {
		const isGLB = !!uri.match(/\.glb$/);
		await (isGLB ? this._writeGLB(uri, doc) : this._writeGLTF(uri, doc));
	}

	/**********************************************************************************************
	 * Protected.
	 */

	/** @internal */
	private async _readResourcesExternal(jsonDoc: JSONDocument, dir: string): Promise<void> {
		const images = jsonDoc.json.images || [];
		const buffers = jsonDoc.json.buffers || [];
		const resources = [...images, ...buffers].map(async (resource: GLTF.IBuffer | GLTF.IImage) => {
			if (resource.uri && !resource.uri.match(/data:/)) {
				const absURI = this._path.resolve(dir, resource.uri);
				jsonDoc.resources[resource.uri] = await this._fs.readFile(absURI);
				this.lastReadBytes += jsonDoc.resources[resource.uri].byteLength;
			}
		});
		await Promise.all(resources);
	}

	/**********************************************************************************************
	 * Private.
	 */

	/** @internal */
	private async _readGLB(uri: string): Promise<JSONDocument> {
		const buffer: Buffer = await this._fs.readFile(uri);
		this.lastReadBytes = buffer.byteLength;
		const jsonDoc = this._binaryToJSON(buffer);
		// Read external resources first, before Data URIs are replaced.
		await this._readResourcesExternal(jsonDoc, this._path.dirname(uri));
		await this._readResourcesInternal(jsonDoc);
		return jsonDoc;
	}

	/** @internal */
	private async _readGLTF(uri: string): Promise<JSONDocument> {
		this.lastReadBytes = 0;
		const jsonContent = await this._fs.readFile(uri, 'utf8');
		this.lastReadBytes += jsonContent.length;
		const jsonDoc = { json: JSON.parse(jsonContent), resources: {} } as JSONDocument;
		// Read external resources first, before Data URIs are replaced.
		await this._readResourcesExternal(jsonDoc, this._path.dirname(uri));
		await this._readResourcesInternal(jsonDoc);
		return jsonDoc;
	}

	/** @internal */
	private async _writeGLTF(uri: string, doc: Document): Promise<void> {
		this.lastWriteBytes = 0;
		const { json, resources } = await this.writeJSON(doc, {
			format: Format.GLTF,
			basename: FileUtils.basename(uri),
		});
		const { _fs: fs, _path: path } = this;
		const dir = path.dirname(uri);
		const jsonContent = JSON.stringify(json, null, 2);
		this.lastWriteBytes += jsonContent.length;
		await fs.writeFile(uri, jsonContent);
		const pending = Object.keys(resources).map(async (resourceName) => {
			const resource = Buffer.from(resources[resourceName]);
			await fs.writeFile(path.join(dir, resourceName), resource);
			this.lastWriteBytes += resource.byteLength;
		});
		await Promise.all(pending);
	}

	/** @internal */
	private async _writeGLB(uri: string, doc: Document): Promise<void> {
		const buffer = Buffer.from(await this.writeBinary(doc));
		await this._fs.writeFile(uri, buffer);
		this.lastWriteBytes = buffer.byteLength;
	}
}
