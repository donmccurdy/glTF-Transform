import { Document } from '../document';
import { JSONDocument } from '../json-document';
import { PlatformIO } from './platform-io';

/**
 * # WebIO
 *
 * *I/O service for Web.*
 *
 * Usage:
 *
 * ```typescript
 * import { WebIO } from '@gltf-transform/core';
 *
 * const io = new WebIO({credentials: 'include'});
 *
 * // Read.
 * const doc = await io.read('model.glb'); // → Document
 * const doc = io.unpackGLB(ArrayBuffer);  // → Document
 *
 * // Write.
 * const arrayBuffer = io.packGLB(doc);    // → ArrayBuffer
 * ```
 *
 * @category I/O
 */
export class WebIO extends PlatformIO {

	/**
	 * Constructs a new WebIO service. Instances are reusable.
	 * @param fetchConfig Configuration object for Fetch API.
	 */
	constructor(private readonly fetchConfig: RequestInit) {
		super();
	}

	/**********************************************************************************************
	 * Public.
	 */

	/** Loads a URI and returns a {@link Document} instance. */
	public read (uri: string): Promise<Document> {
		return this.readAsJSON(uri).then((jsonDoc) => this.readJSON(jsonDoc));
	}

	/** Loads a local path and returns a {@link JSONDocument} struct, without parsing. */
	public readAsJSON (uri: string): Promise<JSONDocument> {
		const isGLB = !!(uri.match(/\.glb$/) || uri.match(/^data:application\/octet-stream;/));
		return isGLB ? this._readGLB(uri) : this._readGLTF(uri);
	}

	/**********************************************************************************************
	 * Private.
	 */

	private _readGLTF (uri: string): Promise<JSONDocument> {
		const jsonDoc = {json: {}, resources: {}} as JSONDocument;
		return fetch(uri, this.fetchConfig)
		.then((response) => response.json())
		.then((json: GLTF.IGLTF) => {
			jsonDoc.json = json;
			const pendingResources: Array<Promise<void>> = [...json.images, ...json.buffers]
			.map((resource: GLTF.IBuffer|GLTF.IImage) => {
				if (resource.uri) {
					return fetch(resource.uri, this.fetchConfig)
					.then((response) => response.arrayBuffer())
					.then((arrayBuffer) => {
						jsonDoc.resources[resource.uri] = arrayBuffer;
					});
				}
			});
			return Promise.all(pendingResources).then(() => jsonDoc);
		});
	}

	private _readGLB (uri: string): Promise<JSONDocument> {
		return fetch(uri, this.fetchConfig)
			.then((response) => response.arrayBuffer())
			.then((arrayBuffer) => this.binaryToJSON(arrayBuffer));
	}
}
