import { Document } from '../document';
import { JSONDocument } from '../json-document';
import { BufferUtils, FileUtils, uuid } from '../utils/';
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
	 * Private.
	 */

	/** @hidden */
	private _readGLB (uri: string): JSONDocument {
		const buffer: Buffer = this._fs.readFileSync(uri);
		const arrayBuffer = BufferUtils.trim(buffer);
		return this.binaryToJSON(arrayBuffer);
	}

	/** @hidden */
	private _readGLTF (uri: string): JSONDocument {
		const dir = this._path.dirname(uri);
		const jsonDoc = {
			json: JSON.parse(this._fs.readFileSync(uri, 'utf8')),
			resources: {}
		} as JSONDocument;
		const images = jsonDoc.json.images || [];
		const buffers = jsonDoc.json.buffers || [];
		[...images, ...buffers].forEach((resource: GLTF.IBuffer|GLTF.IImage) => {
			if (!resource.uri) return; // Skip image.bufferView.

			if (!resource.uri.match(/data:/)) {
				const absURI = this._path.resolve(dir, resource.uri);
				jsonDoc.resources[resource.uri] = BufferUtils.trim(this._fs.readFileSync(absURI));
			} else {
				// Rewrite Data URIs to something short and unique.
				const resourceUUID = `__${uuid()}.${FileUtils.extension(resource.uri)}`;
				jsonDoc.resources[resourceUUID] = BufferUtils.createBufferFromDataURI(resource.uri);
				resource.uri = resourceUUID;
			}
		});
		return jsonDoc;
	}

	/** @hidden */
	private _writeGLTF (uri: string, doc: Document): void {
		const {json, resources} = GLTFWriter.write(doc, {
			basename: FileUtils.basename(uri),
			isGLB: false,
			logger: this._logger
		});
		const {_fs: fs, _path: path} = this;
		const dir = path.dirname(uri);
		fs.writeFileSync(uri, JSON.stringify(json, null, 2));
		Object.keys(resources).forEach((resourceName) => {
			const resource = Buffer.from(resources[resourceName]);
			fs.writeFileSync(path.join(dir, resourceName), resource);
		});
	}

	/** @hidden */
	private _writeGLB (uri: string, doc: Document): void {
		const buffer = Buffer.from(this.writeBinary(doc));
		this._fs.writeFileSync(uri, buffer);
	}
}
