import { Document } from '../document';
import { JSONDocument } from '../json-document';
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

	/** Loads a local path and returns a {@link JSONDocument} struct, without parsing. */
	public readAsJSON (uri: string): Promise<JSONDocument> {
		const isGLB = !!(uri.match(/\.glb$/) || uri.match(/^data:application\/octet-stream;/));
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
		.then((json: GLTF.IGLTF) => {
			jsonDoc.json = json;
			const images = json.images || [];
			const buffers = json.buffers || [];
			const pendingResources: Array<Promise<void>> = [...images, ...buffers]
			.map((resource: GLTF.IBuffer|GLTF.IImage) => {
				if (resource.uri) {
					return fetch(resource.uri, this._fetchConfig)
					.then((response) => response.arrayBuffer())
					.then((arrayBuffer) => {
						jsonDoc.resources[resource.uri] = arrayBuffer;
					});
				}
			});
			return Promise.all(pendingResources).then(() => jsonDoc);
		});
	}

	/** @hidden */
	private _readGLB (uri: string): Promise<JSONDocument> {
		return fetch(uri, this._fetchConfig)
			.then((response) => response.arrayBuffer())
			.then((arrayBuffer) => this.binaryToJSON(arrayBuffer));
	}
}
