import { Format } from '../constants';
import { Document } from '../document';
import { FileUtils } from '../utils/';
import { PlatformIO } from './platform-io';
import { _resolve } from './util-functions';

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
	private _fetch;
	private _httpRegex = /https?:\/\//;

	/** Constructs a new NodeIO service. Instances are reusable. */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	constructor(_fetch?: typeof fetch) {
		super();
		// Excluded from browser builds with 'package.browser' field.
		this._fs = require('fs').promises;
		this._path = require('path');
		this._fetch = _fetch;
	}

	protected async readURI(uri: string, type: 'view'): Promise<Uint8Array>;
	protected async readURI(uri: string, type: 'text'): Promise<string>;
	protected async readURI(uri: string, type: 'view' | 'text'): Promise<Uint8Array | string> {
		if (this._httpRegex.exec(uri)) {
			if (!this._fetch) throw new Error('Cannot parse URL as no fetch implementation has been provided');
			const response = await this._fetch(uri);
			if (type === 'text') return await response.text();
			else if (type === 'view') return new Uint8Array(await response.arrayBuffer());
		}
		switch (type) {
			case 'view':
				return this._fs.readFile(uri);
			case 'text':
				return this._fs.readFile(uri, 'utf8');
		}
	}

	protected resolve(base: string, path: string): string {
		if (this._httpRegex.exec(base) || this._httpRegex.exec(path)) return _resolve(base, path);
		return this._path.resolve(base, path);
	}

	protected dirname(uri: string): string {
		if (this._httpRegex.exec(uri)) return uri.split('/').slice(0, -1).join('/').concat('/');
		return this._path.dirname(uri);
	}

	/**********************************************************************************************
	 * Public.
	 */

	/** Writes a {@link Document} instance to a local path. */
	public async write(uri: string, doc: Document): Promise<void> {
		if (this._httpRegex.exec(uri)) throw new Error('Cannot write to a URL');
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
