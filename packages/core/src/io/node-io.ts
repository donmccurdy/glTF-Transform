import { Document } from '../document';
import { NativeDocument } from '../native-document';
import { BufferUtils, FileUtils, uuid } from '../utils/';
import { PlatformIO } from './platform-io';
import { GLTFReader } from './reader';
import { GLTFWriter } from './writer';

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
export class NodeIO extends PlatformIO {
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

	/** Loads a local path and returns a {@link NativeDocument} struct. */
	public readNativeDocument (uri: string): NativeDocument {
		const isGLB = !!(uri.match(/\.glb$/) || uri.match(/^data:application\/octet-stream;/));
		return isGLB ? this.readGLB(uri) : this.readGLTF(uri);
	}

	/** Loads a local path and returns a {@link Document} instance. */
	public read (uri: string): Document {
		const nativeDoc = this.readNativeDocument(uri);
		return GLTFReader.read(nativeDoc, {extensions: this._extensions, logger: this._logger});
	}

	/** Writes a {@link Document} instance to a local path. */
	public write (uri: string, doc: Document): void {
		const isGLB = !!uri.match(/\.glb$/);
		isGLB ? this.writeGLB(uri, doc) : this.writeGLTF(uri, doc);
	}

	/* Internal. */

	private readGLB (uri: string): NativeDocument {
		const buffer: Buffer = this.fs.readFileSync(uri);
		const arrayBuffer = BufferUtils.trim(buffer);
		return this.unpackGLBToNativeDocument(arrayBuffer);
	}

	private readGLTF (uri: string): NativeDocument {
		const dir = this.path.dirname(uri);
		const nativeDoc = {
			json: JSON.parse(this.fs.readFileSync(uri, 'utf8')),
			resources: {}
		} as NativeDocument;
		const images = nativeDoc.json.images || [];
		const buffers = nativeDoc.json.buffers || [];
		[...images, ...buffers].forEach((resource: GLTF.IBuffer|GLTF.IImage) => {
			if (!resource.uri) return; // Skip image.bufferView.

			if (!resource.uri.match(/data:/)) {
				const absURI = this.path.resolve(dir, resource.uri);
				nativeDoc.resources[resource.uri] = BufferUtils.trim(this.fs.readFileSync(absURI));
			} else {
				// Rewrite Data URIs to something short and unique.
				const resourceUUID = `__${uuid()}.${FileUtils.extension(resource.uri)}`;
				nativeDoc.resources[resourceUUID] = BufferUtils.createBufferFromDataURI(resource.uri);
				resource.uri = resourceUUID;
			}
		});
		return nativeDoc;
	}

	private writeGLTF (uri: string, doc: Document): void {
		const {json, resources} = GLTFWriter.write(doc, {
			basename: FileUtils.basename(uri),
			isGLB: false,
			logger: this._logger
		});
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
