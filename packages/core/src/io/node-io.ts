import { Format } from '../constants.js';
import type { Document } from '../document.js';
import { FileUtils } from '../utils/index.js';
import { PlatformIO } from './platform-io.js';
import { HTTPUtils } from '../utils/index.js';

/**
 * *I/O service for Node.js.*
 *
 * The most common use of the I/O service is to read/write a {@link Document} with a given path.
 * Methods are also available for converting in-memory representations of raw glTF files, both
 * binary (*Uint8Array*) and JSON ({@link JSONDocument}).
 *
 * Usage:
 *
 * ```typescript
 * import { NodeIO } from '@gltf-transform/core';
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
 * By default, NodeIO can only read/write paths on disk. To enable HTTP requests, provide a Fetch
 * API implementation (such as [`node-fetch`](https://www.npmjs.com/package/node-fetch)) and enable
 * {@link NodeIO.setAllowHTTP setAllowHTTP}. HTTP requests may optionally be configured with
 * [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/fetch#parameters) parameters.
 *
 * ```typescript
 * import fetch from 'node-fetch';
 *
 * const io = new NodeIO(fetch, {headers: {...}}).setAllowHTTP(true);
 *
 * const document = await io.read('https://example.com/path/to/model.glb');
 * ```
 *
 * @category I/O
 */
export class NodeIO extends PlatformIO {
	private declare _fs;
	private declare _path;
	private readonly _fetch: typeof fetch | null;
	private readonly _fetchConfig: RequestInit;

	private _init: Promise<void>;
	private _fetchEnabled = false;

	/**
	 * Constructs a new NodeIO service. Instances are reusable. By default, only NodeIO can only
	 * read/write paths on disk. To enable HTTP requests, provide a Fetch API implementation and
	 * enable {@link NodeIO.setAllowHTTP setAllowHTTP}.
	 *
	 * @param fetch Implementation of Fetch API.
	 * @param fetchConfig Configuration object for Fetch API.
	 */
	constructor(_fetch: unknown = null, _fetchConfig = HTTPUtils.DEFAULT_INIT) {
		super();
		this._fetch = _fetch as typeof fetch | null;
		this._fetchConfig = _fetchConfig;
		this._init = this.init();
	}

	public async init(): Promise<void> {
		if (this._init) return this._init;
		return Promise.all([import('fs'), import('path')]).then(([fs, path]) => {
			this._fs = fs.promises;
			this._path = path;
		});
	}

	public setAllowHTTP(allow: boolean): this {
		if (allow && !this._fetch) {
			throw new Error('NodeIO requires a Fetch API implementation for HTTP requests.');
		}
		this._fetchEnabled = allow;
		return this;
	}

	protected async readURI(uri: string, type: 'view'): Promise<Uint8Array>;
	protected async readURI(uri: string, type: 'text'): Promise<string>;
	protected async readURI(uri: string, type: 'view' | 'text'): Promise<Uint8Array | string> {
		await this.init();
		if (HTTPUtils.isAbsoluteURL(uri)) {
			if (!this._fetchEnabled || !this._fetch) {
				throw new Error('Network request blocked. Allow HTTP requests explicitly, if needed.');
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
		// https://github.com/KhronosGroup/glTF/issues/1449
		// https://stackoverflow.com/a/27278490/1314762
		return this._path.resolve(base, decodeURIComponent(path));
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
		await this.init();
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
		const pending = Object.keys(resources).map(async (resourceURI) => {
			if (HTTPUtils.isAbsoluteURL(resourceURI)) {
				if (HTTPUtils.extension(resourceURI) === 'bin') {
					throw new Error(`Cannot write buffer to path "${resourceURI}".`);
				}
				return;
			}
			// TODO(v4): Consider storing decoded URIs in memory, and avoid decoding here. However,
			// we'll need to think through implications for absolute URLs.
			const resource = Buffer.from(resources[resourceURI]);
			const resourcePath = path.join(dir, decodeURIComponent(resourceURI));
			await fs.mkdir(path.dirname(resourcePath), { recursive: true });
			await fs.writeFile(resourcePath, resource);
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
