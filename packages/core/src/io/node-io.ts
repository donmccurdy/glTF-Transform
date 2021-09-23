import { Format } from '../constants';
import { Document } from '../document';
import { JSONDocument } from '../json-document';
import { GLTF } from '../types/gltf';
import { BufferUtils, FileUtils } from '../utils/';
import { PlatformIO } from './platform-io';
import { GLTFReader } from './reader';
import { GLTFWriter } from './writer';

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
 * const fs = require('fs');
 * const path = require('path');
 * const { NodeIO } = require('@gltf-transform/core');
 *
 * const io = new NodeIO();
 *
 * // Read.
 * io.read('model.glb');             // → Document
 * io.readBinary(ArrayBuffer);       // → Document
 *
 * // Write.
 * io.write('model.glb', doc); // → void
 * io.writeBinary(doc);        // → ArrayBuffer
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
		this._fs = require('fs');
		this._path = require('path');
	}

	/**********************************************************************************************
	 * Public.
	 */

	/** Loads a local path and returns a {@link Document} instance. */
	public read (uri: string): Document {
		const jsonDoc = this.readAsJSON(uri);
		return GLTFReader.read(jsonDoc, {
			extensions: this._extensions,
			dependencies: this._dependencies,
			logger: this._logger
		});
	}

	/** Loads a local path and returns a {@link JSONDocument} struct, without parsing. */
	public readAsJSON (uri: string): JSONDocument {
		const isGLB = !!(uri.match(/\.glb$/) || uri.match(/^data:application\/octet-stream;/));
		return isGLB ? this._readGLB(uri) : this._readGLTF(uri);
	}

	/** Writes a {@link Document} instance to a local path. */
	public write (uri: string, doc: Document): void {
		const isGLB = !!uri.match(/\.glb$/);
		isGLB ? this._writeGLB(uri, doc) : this._writeGLTF(uri, doc);
	}

	/**********************************************************************************************
	 * Protected.
	 */

	/** @internal */
	protected _readResourcesExternal(jsonDoc: JSONDocument, dir: string): void {
		const images = jsonDoc.json.images || [];
		const buffers = jsonDoc.json.buffers || [];
		[...images, ...buffers].forEach((resource: GLTF.IBuffer|GLTF.IImage) => {
			if (resource.uri && !resource.uri.match(/data:/)) {
				const absURI = this._path.resolve(dir, resource.uri);
				jsonDoc.resources[resource.uri] = BufferUtils.trim(this._fs.readFileSync(absURI));
				this.lastReadBytes += jsonDoc.resources[resource.uri].byteLength;
			}
		});
	}

	/**********************************************************************************************
	 * Private.
	 */

	/** @internal */
	private _readGLB (uri: string): JSONDocument {
		const buffer: Buffer = this._fs.readFileSync(uri);
		const arrayBuffer = BufferUtils.trim(buffer);
		this.lastReadBytes = arrayBuffer.byteLength;
		const jsonDoc = this._binaryToJSON(arrayBuffer);
		// Read external resources first, before Data URIs are replaced.
		this._readResourcesExternal(jsonDoc, this._path.dirname(uri));
		this._readResourcesInternal(jsonDoc);
		return jsonDoc;
	}

	/** @internal */
	private _readGLTF (uri: string): JSONDocument {
		this.lastReadBytes = 0;
		const jsonContent = this._fs.readFileSync(uri, 'utf8');
		this.lastReadBytes += jsonContent.length;
		const jsonDoc = {json: JSON.parse(jsonContent), resources: {}} as JSONDocument;
		// Read external resources first, before Data URIs are replaced.
		this._readResourcesExternal(jsonDoc, this._path.dirname(uri));
		this._readResourcesInternal(jsonDoc);
		return jsonDoc;
	}

	/** @internal */
	private _writeGLTF (uri: string, doc: Document): void {
		this.lastWriteBytes = 0;
		const {json, resources} = GLTFWriter.write(doc, {
			format: Format.GLTF,
			logger: this._logger,
			dependencies: this._dependencies,
			vertexLayout: this._vertexLayout,
			basename: FileUtils.basename(uri),
		});
		const {_fs: fs, _path: path} = this;
		const dir = path.dirname(uri);
		const jsonContent = JSON.stringify(json, null, 2);
		this.lastWriteBytes += jsonContent.length;
		fs.writeFileSync(uri, jsonContent);
		Object.keys(resources).forEach((resourceName) => {
			const resource = Buffer.from(resources[resourceName]);
			fs.writeFileSync(path.join(dir, resourceName), resource);
			this.lastWriteBytes += resource.byteLength;
		});
	}

	/** @internal */
	private _writeGLB (uri: string, doc: Document): void {
		const buffer = Buffer.from(this.writeBinary(doc));
		this._fs.writeFileSync(uri, buffer);
		this.lastWriteBytes = buffer.byteLength;
	}
}
