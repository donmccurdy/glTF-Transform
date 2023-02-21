import { PlatformIO } from './platform-io.js';
import { HTTPUtils } from '../utils/index.js';
import { Format } from '../constants.js';

/**
 * # WebIO
 *
 * *I/O service for Web.*
 *
 * The most common use of the I/O service is to read/write a {@link Document} with a given path.
 * Methods are also available for converting in-memory representations of raw glTF files, both
 * binary (*Uint8Array*) and JSON ({@link JSONDocument}).
 *
 * Usage:
 *
 * ```typescript
 * import { WebIO } from '@gltf-transform/core';
 *
 * const io = new WebIO({credentials: 'include'});
 *
 * // Read.
 * let document;
 * document = await io.read('model.glb');  // → Document
 * document = await io.readBinary(glb);    // Uint8Array → Document
 *
 * // Write.
 * const glb = await io.writeBinary(document); // Document → Uint8Array
 * ```
 *
 * @category I/O
 */
export class WebIO extends PlatformIO {
	private readonly _fetchConfig: RequestInit;

	/**
	 * Constructs a new WebIO service. Instances are reusable.
	 * @param fetchConfig Configuration object for Fetch API.
	 */
	constructor(fetchConfig = HTTPUtils.DEFAULT_INIT) {
		super();
		this._fetchConfig = fetchConfig;
	}

	protected async readURI(uri: string, type: 'view'): Promise<Uint8Array>;
	protected async readURI(uri: string, type: 'text'): Promise<string>;
	protected async readURI(uri: string, type: 'view' | 'text'): Promise<Uint8Array | string> {
		const response = await fetch(uri, this._fetchConfig);
		switch (type) {
			case 'view':
				return new Uint8Array(await response.arrayBuffer());
			case 'text':
				return response.text();
		}
	}

	protected resolve(base: string, path: string): string {
		return HTTPUtils.resolve(base, path);
	}

	protected dirname(uri: string): string {
		return HTTPUtils.dirname(uri);
	}

	/** @hidden */
	protected detectFormat(uri: string): Format {
		return HTTPUtils.extension(uri) === 'glb' ? Format.GLB : Format.GLTF;
	}
}
