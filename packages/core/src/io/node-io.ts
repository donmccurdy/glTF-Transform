import { Format } from '../constants';
import { Document } from '../document';
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
	private _nodeFetch;
	private _httpRegex = /https?:\/\//;
	public useFetch = false;

	/** Constructs a new NodeIO service. Instances are reusable. */
	constructor() {
		super();
		// Excluded from browser builds with 'package.browser' field.
		this._fs = require('fs').promises;
		this._path = require('path');
		this._nodeFetch = require('node-fetch');
	}

	protected async readURI(uri: string, type: 'view'): Promise<Uint8Array>;
	protected async readURI(uri: string, type: 'text'): Promise<string>;
	protected async readURI(uri: string, type: 'view' | 'text'): Promise<Uint8Array | string> {
		switch (type) {
			case 'view': {
        if(this.useFetch && this._httpRegex.exec(uri)) {
					const response = await this._nodeFetch(uri);
					return new Uint8Array(await response.arrayBuffer());
				} 
				return this._fs.readFile(uri);
      }
			case 'text': {
        if(this.useFetch && this._httpRegex.exec(uri)) {
					const response = await this._nodeFetch(uri);
					return await response.text();
				} 
				return this._fs.readFile(uri, 'utf8');
      }
		}
	}

	protected resolve(directory: string, path: string): string {
    if(this.useFetch) return `${directory}/${path}`;
		return this._path.resolve(directory, path);
	}

	protected dirname(uri: string): string {
    if(this.useFetch) return uri.split('/').slice(0, -1).join('/');
		return this._path.dirname(uri);
	}

	/**********************************************************************************************
	 * Public.
	 */

	/** Writes a {@link Document} instance to a local path. */
	public async write(uri: string, doc: Document): Promise<void> {
		const isGLB = !!uri.match(/\.glb$/);
		await (isGLB ? this._writeGLB(uri, doc) : this._writeGLTF(uri, doc));
	}

	/**********************************************************************************************
	 * Private.
	 */

	/** @internal */
	private async _writeGLTF(uri: string, doc: Document): Promise<void> {
		this.lastWriteBytes = 0;
		const { json, resources } = await this.writeJSON(doc, {
			format: Format.GLTF,
			basename: FileUtils.basename(uri),
		});
		const { _fs: fs } = this;
		const dir = this.dirname(uri);
		const jsonContent = JSON.stringify(json, null, 2);
		this.lastWriteBytes += jsonContent.length;
		await fs.writeFile(uri, jsonContent);
		const pending = Object.keys(resources).map(async (resourceName) => {
			const resource = Buffer.from(resources[resourceName]);
			await fs.writeFile(this.resolve(dir, resourceName), resource);
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
