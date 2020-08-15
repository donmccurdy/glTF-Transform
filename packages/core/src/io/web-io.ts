import { Document } from '../document';
import { NativeDocument } from '../native-document';
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

	/* Public. */

	/** Loads a URI and returns a {@link NativeDocument} struct. */
	public readNativeDocument (uri: string): Promise<NativeDocument> {
		const isGLB = !!(uri.match(/\.glb$/) || uri.match(/^data:application\/octet-stream;/));
		return isGLB ? this.readGLB(uri) : this.readGLTF(uri);
	}

	/** Loads a URI and returns a {@link Document} instance. */
	public read (uri: string): Promise<Document> {
		return this.readNativeDocument(uri)
			.then((nativeDoc) => this.createDocument(nativeDoc));
	}

	/* Internal. */

	private readGLTF (uri: string): Promise<NativeDocument> {
		const nativeDoc = {json: {}, resources: {}} as NativeDocument;
		return fetch(uri, this.fetchConfig)
		.then((response) => response.json())
		.then((json: GLTF.IGLTF) => {
			nativeDoc.json = json;
			const pendingResources: Array<Promise<void>> = [...json.images, ...json.buffers]
			.map((resource: GLTF.IBuffer|GLTF.IImage) => {
				if (resource.uri) {
					return fetch(resource.uri, this.fetchConfig)
					.then((response) => response.arrayBuffer())
					.then((arrayBuffer) => {
						nativeDoc.resources[resource.uri] = arrayBuffer;
					});
				}
			});
			return Promise.all(pendingResources).then(() => nativeDoc);
		});
	}

	private readGLB (uri: string): Promise<NativeDocument> {
		return fetch(uri, this.fetchConfig)
			.then((response) => response.arrayBuffer())
			.then((arrayBuffer) => this.unpackGLBToNativeDocument(arrayBuffer));
	}
}
