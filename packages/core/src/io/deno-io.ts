import { PlatformIO } from '.';

declare global {
	const Deno: {
		readFile: (path: string) => Promise<Uint8Array>;
		readTextFile: (path: string) => Promise<string>;
	};
}

interface Path {
	resolve(directory: string, path: string): string;
	dirname(uri: string): string;
}

/**
 * # DenoIO
 *
 * *I/O service for Deno.*
 *
 * The most common use of the I/O service is to read/write a {@link Document} with a given path.
 * Methods are also available for converting in-memory representations of raw glTF files, both
 * binary (*ArrayBuffer*) and JSON ({@link JSONDocument}).
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

	protected resolve(directory: string, path: string): string {
		return this._path.resolve(directory, path);
	}

	protected dirname(uri: string): string {
		return this._path.dirname(uri);
	}
}
