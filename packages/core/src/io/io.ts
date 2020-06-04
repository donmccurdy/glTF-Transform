import { GLB_BUFFER } from '../constants';
import { Document } from '../document';
import { NativeDocument } from '../native-document';
import { BufferUtils, FileUtils, uuid } from '../utils/';
import { GLTFReader } from './reader';
import { GLTFWriter, WriterOptions } from './writer';

/**
 * # PlatformIO
 *
 * *Abstract I/O service.*
 *
 * For platform-specific implementations, see {@link NodeIO} and {@link WebIO}.
 *
 * @category I/O
 */
abstract class PlatformIO {
	/** Converts glTF-formatted JSON and a resource map to a {@link Document}. */
	public createDocument (nativeDoc: NativeDocument): Document {
		return GLTFReader.read(nativeDoc);
	}

	/** Converts a {@link Document} to glTF-formatted JSON and a resource map. */
	public createNativeDocument (doc: Document, options: WriterOptions): NativeDocument {
		if (options.isGLB && doc.getRoot().listBuffers().length !== 1) {
			throw new Error('GLB must have exactly 1 buffer.');
		}
		return GLTFWriter.write(doc, options);
	}

	/** Converts a GLB-formatted ArrayBuffer to a {@link Document}. */
	public unpackGLB(glb: ArrayBuffer): Document {
		// Decode and verify GLB header.
		const header = new Uint32Array(glb, 0, 3);
		if (header[0] !== 0x46546C67) {
			throw new Error('Invalid glTF asset.');
		} else if (header[1] !== 2) {
			throw new Error(`Unsupported glTF binary version, "${header[1]}".`);
		}

		// Decode and verify chunk headers.
		const jsonChunkHeader = new Uint32Array(glb, 12, 2);
		const jsonByteOffset = 20;
		const jsonByteLength = jsonChunkHeader[0];
		const binaryChunkHeader = new Uint32Array(glb, jsonByteOffset + jsonByteLength, 2);
		if (jsonChunkHeader[1] !== 0x4E4F534A || binaryChunkHeader[1] !== 0x004E4942) {
			throw new Error('Unexpected GLB layout.');
		}

		// Decode content.
		const jsonText = BufferUtils.decodeText(
			glb.slice(jsonByteOffset, jsonByteOffset + jsonByteLength)
		);
		const json = JSON.parse(jsonText) as GLTF.IGLTF;
		const binaryByteOffset = jsonByteOffset + jsonByteLength + 8;
		const binaryByteLength = binaryChunkHeader[0];
		const binary = glb.slice(binaryByteOffset, binaryByteOffset + binaryByteLength);

		return this.createDocument({json, resources: {[GLB_BUFFER]: binary}});
	}

	/** Converts a {@link Document} to a GLB-formatted ArrayBuffer. */
	public packGLB(doc: Document): ArrayBuffer {
		const {json, resources} = this.createNativeDocument(doc, {basename: '', isGLB: true});

		const jsonText = JSON.stringify(json);
		const jsonChunkData = BufferUtils.pad( BufferUtils.encodeText(jsonText), 0x20 );
		const jsonChunkHeader = new Uint32Array([jsonChunkData.byteLength, 0x4E4F534A]).buffer;
		const jsonChunk = BufferUtils.concat([jsonChunkHeader, jsonChunkData]);

		const binaryChunkData = BufferUtils.pad(Object.values(resources)[0], 0x00);
		const binaryChunkHeader = new Uint32Array([binaryChunkData.byteLength, 0x004E4942]).buffer;
		const binaryChunk = BufferUtils.concat([binaryChunkHeader, binaryChunkData]);

		const header = new Uint32Array([
			0x46546C67, 2, 12 + jsonChunk.byteLength + binaryChunk.byteLength
		]).buffer;

		return BufferUtils.concat([header, jsonChunk, binaryChunk]);
	}
}

/**
 * # NodeIO
 *
 * *I/O service for Node.js.*
 *
 * Usage:
 *
 * ```typescript
 * const fs = require('fs');
 * const path = require('path');
 * const { NodeIO } = require('@gltf-transform/core');
 *
 * const io = new NodeIO(fs, path);
 *
 * // Read.
 * io.read('model.glb');             // → Document
 * io.unpackGLB(ArrayBuffer);        // → Document
 *
 * // Write.
 * io.write('model.glb', doc); // → void
 * io.packGLB(doc);            // → ArrayBuffer
 * ```
 *
 * @category I/O
 */
class NodeIO extends PlatformIO {
	/**
	 * Constructs a new NodeIO service. Instances are reusable.
	 * @param fs
	 * @param path
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	constructor(private readonly fs: any, private readonly path: any) {
		super();
	}

	/* Public. */

	/** Loads a local path and returns a {@link Document} instance. */
	public read (uri: string): Document {
		const isGLB = !!uri.match(/\.glb$/);
		return isGLB ? this.readGLB(uri) : this.readGLTF(uri);
	}

	/** Writes a {@link Document} instance to a local path. */
	public write (uri: string, doc: Document): void {
		const isGLB = !!uri.match(/\.glb$/);
		isGLB ? this.writeGLB(uri, doc) : this.writeGLTF(uri, doc);
	}

	/* Internal. */

	private readGLB (uri: string): Document {
		const buffer: Buffer = this.fs.readFileSync(uri);
		const arrayBuffer = BufferUtils.trim(buffer);
		return this.unpackGLB(arrayBuffer);
	}

	private readGLTF (uri: string): Document {
		const dir = this.path.dirname(uri);
		const nativeDoc = {
			json: JSON.parse(this.fs.readFileSync(uri, 'utf8')),
			resources: {}
		} as NativeDocument;
		const images = nativeDoc.json.images || [];
		const buffers = nativeDoc.json.buffers || [];
		[...images, ...buffers].forEach((resource: GLTF.IBuffer|GLTF.IImage) => {
			if (resource.uri && !resource.uri.match(/data:/)) {
				const absURI = this.path.resolve(dir, resource.uri);
				nativeDoc.resources[resource.uri] = BufferUtils.trim(this.fs.readFileSync(absURI));
			} else {
				// Rewrite Data URIs to something short and unique.
				const resourceUUID = `__${uuid()}.${FileUtils.extension(resource.uri)}`;
				nativeDoc.resources[resourceUUID] = BufferUtils.createBufferFromDataURI(resource.uri);
				resource.uri = resourceUUID;
			}
		})
		return GLTFReader.read(nativeDoc);
	}

	private writeGLTF (uri: string, doc: Document): void {
		const writerOptions = {basename: FileUtils.basename(uri), isGLB: false};
		const {json, resources} = GLTFWriter.write(doc, writerOptions);
		const {fs, path} = this;
		const dir = path.dirname(uri);
		fs.writeFileSync(uri, JSON.stringify(json, null, 2));
		Object.keys(resources).forEach((resourceName) => {
			const resource = Buffer.from(resources[resourceName]);
			fs.writeFileSync(path.join(dir, resourceName), resource);
		});
	}

	private writeGLB (uri: string, doc: Document): void {
		const buffer = Buffer.from(this.packGLB(doc));
		this.fs.writeFileSync(uri, buffer);
	}
}

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
class WebIO extends PlatformIO {

	/**
	 * Constructs a new WebIO service. Instances are reusable.
	 * @param fetchConfig Configuration object for Fetch API.
	 */
	constructor(private readonly fetchConfig: RequestInit) {
		super();
	}

	/* Public. */

	/** Loads a URI and returns a {@link Document} instance. */
	public read (uri: string): Promise<Document> {
		const isGLB = !!uri.match(/\.glb$/);
		return isGLB ? this.readGLB(uri) : this.readGLTF(uri);
	}

	/* Internal. */

	private readGLTF (uri: string): Promise<Document> {
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
			return Promise.all(pendingResources)
			.then(() => this.createDocument(nativeDoc));
		});
	}

	private readGLB (uri: string): Promise<Document> {
		return fetch(uri, this.fetchConfig)
			.then((response) => response.arrayBuffer())
			.then((arrayBuffer) => this.unpackGLB(arrayBuffer));
	}
}

export {NodeIO, WebIO};
