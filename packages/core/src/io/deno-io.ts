import { PlatformIO } from './platform-io.js';

interface Path {
	resolve(base: string, path: string): string;
	dirname(uri: string): string;
}

/**
 * *I/O service for [Deno](https://deno.land/).*
 *
 * The most common use of the I/O service is to read/write a {@link Document} with a given path.
 * Methods are also available for converting in-memory representations of raw glTF files, both
 * binary (*Uint8Array*) and JSON ({@link JSONDocument}).
 *
 * _*NOTICE:* Support for the Deno environment is currently experimental. See
 * [glTF-Transform#457](https://github.com/donmccurdy/glTF-Transform/issues/457)._
 *
 * Usage:
 *
 * ```typescript
 * import { DenoIO } from 'https://esm.sh/@gltf-transform/core';
 * import * as path from 'https://deno.land/std/path/mod.ts';
 *
 * const io = new DenoIO(path);
 *
 * // Read.
 * let document;
 * document = io.read('model.glb');  // → Document
 * document = io.readBinary(glb);    // Uint8Array → Document
 *
 * // Write.
 * const glb = io.writeBinary(document);  // Document → Uint8Array
 * ```
 *
 * @category I/O
 */
export class DenoIO extends PlatformIO {
	private _path: Path;

	constructor(path: unknown) {
		super();
		this._path = path as Path;
	}

	protected async readURI(uri: string, type: 'view'): Promise<Uint8Array>;
	protected async readURI(uri: string, type: 'text'): Promise<string>;
	protected async readURI(uri: string, type: 'view' | 'text'): Promise<Uint8Array | string> {
		switch (type) {
			case 'view':
				return Deno.readFile(uri);
			case 'text':
				return Deno.readTextFile(uri);
		}
	}

	protected resolve(base: string, path: string): string {
		// https://github.com/KhronosGroup/glTF/issues/1449
		// https://stackoverflow.com/a/27278490/1314762
		return this._path.resolve(base, decodeURIComponent(path));
	}

	protected dirname(uri: string): string {
		return this._path.dirname(uri);
	}
}
