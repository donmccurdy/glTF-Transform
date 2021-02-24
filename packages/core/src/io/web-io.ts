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
	 * Private.
	 */

	/** @hidden */
	private _readGLTF (uri: string): Promise<JSONDocument> {
		const jsonDoc = {json: {}, resources: {}} as JSONDocument;
		return fetch(uri, this._fetchConfig)
		.then((response) => response.json())
		.then(async (json: GLTF.IGLTF) => {
			jsonDoc.json = json;
			await this._readResources(jsonDoc, _dirname(uri), false);
			return jsonDoc;
		});
	}

	/** @hidden */
	private _readGLB (uri: string): Promise<JSONDocument> {
		return fetch(uri, this._fetchConfig)
			.then((response) => response.arrayBuffer())
			.then(async (arrayBuffer) => {
				const jsonDoc = this._binaryToJSON(arrayBuffer);
				await this._readResources(jsonDoc, _dirname(uri), true);
				return jsonDoc;
			});
	}

	/** @hidden */
	private _readResources (jsonDoc: JSONDocument, dir: string, isGLB: boolean): Promise<void> {
		const json = jsonDoc.json;
		const images = json.images || [];
		const buffers = json.buffers || [];
		const pendingResources: Array<Promise<void>> = [...images, ...buffers]
		.map((resource: GLTF.IBuffer|GLTF.IImage, index: number) => {
			if (!resource.uri) {
				const isGLBBuffer = isGLB && index === images.length;
				if (resource['bufferView'] === undefined && !isGLBBuffer) {
					throw new Error('Missing resource URI.');
				}
				return;
			}

			return fetch(_resolve(dir, resource.uri), this._fetchConfig)
				.then((response) => response.arrayBuffer())
				.then((arrayBuffer) => {
					jsonDoc.resources[resource.uri] = arrayBuffer;
				});
		});
		return Promise.all(pendingResources).then(() => undefined);
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
