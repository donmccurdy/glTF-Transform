import { Document } from '../document';
import { JSONDocument } from '../json-document';
import { GLTF } from '../types/gltf';
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
 * const doc = await io.read('model.glb');  // → Document
 * const doc = io.readBinary(ArrayBuffer);  // → Document
 *
 * // Write.
 * const arrayBuffer = io.writeBinary(doc); // → ArrayBuffer
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

	/**********************************************************************************************
	 * Public.
	 */

	/** Loads a URI and returns a {@link Document} instance. */
	public read (uri: string): Promise<Document> {
		return this.readAsJSON(uri).then((jsonDoc) => this.readJSON(jsonDoc));
	}

	/** Loads a URI and returns a {@link JSONDocument} struct, without parsing. */
	public readAsJSON (uri: string): Promise<JSONDocument> {
		const isGLB = uri.match(/^data:application\/octet-stream;/)
			|| new URL(uri, window.location.href).pathname.match(/\.glb$/);
		return isGLB ? this._readGLB(uri) : this._readGLTF(uri);
	}

	/**********************************************************************************************
	 * Protected.
	 */

	/** @internal */
	private _readResourcesExternal (jsonDoc: JSONDocument, dir: string): Promise<void> {
		const images = jsonDoc.json.images || [];
		const buffers = jsonDoc.json.buffers || [];
		const pendingResources: Array<Promise<void>> = [...images, ...buffers]
			.map((resource: GLTF.IBuffer|GLTF.IImage): Promise<void> => {
				const uri = resource.uri;
				if (!uri || uri.match(/data:/)) return Promise.resolve();

				return fetch(_resolve(dir, uri), this._fetchConfig)
					.then((response) => response.arrayBuffer())
					.then((arrayBuffer) => {
						jsonDoc.resources[uri] = arrayBuffer;
					});
			});
		return Promise.all(pendingResources).then(() => undefined);
	}

	/**********************************************************************************************
	 * Private.
	 */

	/** @internal */
	private _readGLTF (uri: string): Promise<JSONDocument> {
		const jsonDoc = {json: {}, resources: {}} as JSONDocument;
		return fetch(uri, this._fetchConfig)
			.then((response) => response.json())
			.then(async (json: GLTF.IGLTF) => {
				jsonDoc.json = json;
				// Read external resources first, before Data URIs are replaced.
				await this._readResourcesExternal(jsonDoc, _dirname(uri));
				this._readResourcesInternal(jsonDoc);
				return jsonDoc;
			});
	}

	/** @internal */
	private _readGLB (uri: string): Promise<JSONDocument> {
		return fetch(uri, this._fetchConfig)
			.then((response) => response.arrayBuffer())
			.then(async (arrayBuffer) => {
				const jsonDoc = this._binaryToJSON(arrayBuffer);
				// Read external resources first, before Data URIs are replaced.
				await this._readResourcesExternal(jsonDoc, _dirname(uri));
				this._readResourcesInternal(jsonDoc);
				return jsonDoc;
			});
	}
}

function _dirname(path: string): string {
	const index = path.lastIndexOf('/');
	if (index === - 1) return './';
	return path.substr(0, index + 1);
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
