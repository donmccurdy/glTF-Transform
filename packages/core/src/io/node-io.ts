import { Format } from '../constants';
import { Document } from '../document';
import { FileUtils } from '../utils/';
import { PlatformIO } from './platform-io';
import { HTTPUtils } from '../utils';

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
 * When initialized without constructor arguments (`new NodeIO()`), NodeIO reads/writes to disk
 * using Node.js `fs` utilities. When initialized with a Fetch API implementation such as
 * [`node-fetch`](https://www.npmjs.com/package/node-fetch), and optional
 * [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/fetch#parameters) parameters,
 * NodeIO can also make HTTP requests for resources:
 *
 * ```typescript
 * import fetch from 'node-fetch';
 *
 * const io = new NodeIO(fetch, {headers: {...}});
 *
 * const document = await io.read('https://example.com/path/to/model.glb');
 * ```
 *
 * @category I/O
 */
export class NodeIO extends PlatformIO {
	private readonly _fs;
	private readonly _path;
	private readonly _fetch: typeof fetch | null;
	private readonly _fetchConfig: RequestInit;

	/**
	 * Constructs a new NodeIO service. Instances are reusable. When the optional Fetch API
	 * parameters are included, NodeIO can make HTTP requests for resources. Without them,
	 * only paths on disk are supported.
	 *
	 * @param fetch Implementation of Fetch API.
	 * @param fetchConfig Configuration object for Fetch API.
	 */
	constructor(_fetch: unknown = null, _fetchConfig = HTTPUtils.DEFAULT_INIT) {
		super();
		// Excluded from browser builds with 'package.browser' field.
		this._fs = require('fs').promises;
		this._path = require('path');
		this._fetch = _fetch as typeof fetch | null;
		this._fetchConfig = _fetchConfig;
	}

	protected async readURI(uri: string, type: 'view'): Promise<Uint8Array>;
	protected async readURI(uri: string, type: 'text'): Promise<string>;
	protected async readURI(uri: string, type: 'view' | 'text'): Promise<Uint8Array | string> {
		if (HTTPUtils.isAbsoluteURL(uri)) {
			if (!this._fetch) {
				throw new Error('NodeIO requires a Fetch API implementation for HTTP requests.');
			}

			const response = await this._fetch(uri, this._fetchConfig);
			switch (type) {
				case 'view':
					return new Uint8Array(await response.arrayBuffer());
				case 'text':
					return response.text();
			}
		} else {
			switch (type) {
				case 'view':
					return this._fs.readFile(uri);
				case 'text':
					return this._fs.readFile(uri, 'utf8');
			}
		}
	}

	protected resolve(base: string, path: string): string {
		if (HTTPUtils.isAbsoluteURL(base) || HTTPUtils.isAbsoluteURL(path)) {
			return HTTPUtils.resolve(base, path);
		}
		return this._path.resolve(base, path);
	}

	protected dirname(uri: string): string {
		if (HTTPUtils.isAbsoluteURL(uri)) {
			return HTTPUtils.dirname(uri);
		}
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
