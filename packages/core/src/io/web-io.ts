import { PlatformIO } from './platform-io';

const DEFAULT_INIT: RequestInit = {};

/**
 * # WebIO
 *
 * *I/O service for Web.*
 *
 * The most common use of the I/O service is to read/write a {@link Document} with a given path.
 * Methods are also available for converting in-memory representations of raw glTF files, both
 * binary (*ArrayBuffer*) and JSON ({@link JSONDocument}).
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
	/**
	 * Constructs a new WebIO service. Instances are reusable.
	 * @param _fetchConfig Configuration object for Fetch API.
	 */
	constructor(private readonly _fetchConfig: RequestInit = DEFAULT_INIT) {
		super();
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

	protected resolve(directory: string, path: string): string {
		return _resolve(directory, path);
	}

	protected dirname(uri: string): string {
		return _dirname(uri);
	}
}

function _dirname(path: string): string {
	const index = path.lastIndexOf('/');
	if (index === -1) return './';
	return path.substring(0, index + 1);
}

function _resolve(base: string, path: string) {
	if (!_isRelative(path)) return path;

	const stack = base.split('/');
	const parts = path.split('/');
	stack.pop();
	for (let i = 0; i < parts.length; i++) {
		if (parts[i] === '.') continue;
		if (parts[i] === '..') {
			stack.pop();
		} else {
			stack.push(parts[i]);
		}
	}
	return stack.join('/');
}

function _isRelative(path: string): boolean {
	return !/^(?:[a-zA-Z]+:)?\//.test(path);
}
