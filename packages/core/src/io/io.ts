import { GLB_BUFFER } from '../constants';
import { Container } from '../container';
import { GLTFUtil } from '../util';
import { Asset } from './asset';
import { GLTFReader } from './reader';
import { GLTFWriter, WriterOptions } from './writer';

/**
 * Abstract I/O service.
 *
 * For platform-specific implementations, see {@link NodeIO} and {@link WebIO}.
 */
abstract class PlatformIO {
	/** Converts glTF-formatted JSON and a resource map to a {@link Container}. */
	public assetToContainer (asset: Asset): Container {
		return GLTFReader.read(asset);
	}

	/** Converts a {@link Container} to glTF-formatted JSON and a resource map. */
	public containerToAsset (container: Container, options: WriterOptions): Asset {
		if (options.isGLB && container.getRoot().listBuffers().length !== 1) {
			throw new Error('GLB must have exactly 1 buffer.');
		}
		return GLTFWriter.write(container, options);
	}

	/** Converts a GLB-formatted ArrayBuffer to a {@link Container}. */
	public unpackGLB(glb: ArrayBuffer): Container {
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
		const jsonText = GLTFUtil.decodeText(
			glb.slice(jsonByteOffset, jsonByteOffset + jsonByteLength)
		);
		const json = JSON.parse(jsonText) as GLTF.IGLTF;
		const binaryByteOffset = jsonByteOffset + jsonByteLength + 8;
		const binaryByteLength = binaryChunkHeader[0];
		const binary = glb.slice(binaryByteOffset, binaryByteOffset + binaryByteLength);

		return this.assetToContainer({json, resources: {[GLB_BUFFER]: binary}});
	}

	/** Converts a {@link Container} to a GLB-formatted ArrayBuffer. */
	public packGLB(container: Container): ArrayBuffer {
		const {json, resources} = this.containerToAsset(container, {basename: '', isGLB: true});

		const jsonText = JSON.stringify(json);
		const jsonChunkData = GLTFUtil.pad( GLTFUtil.encodeText(jsonText), 0x20 );
		const jsonChunkHeader = new Uint32Array([jsonChunkData.byteLength, 0x4E4F534A]).buffer;
		const jsonChunk = GLTFUtil.join(jsonChunkHeader, jsonChunkData);

		const binaryChunkData = GLTFUtil.pad(Object.values(resources)[0], 0x00);
		const binaryChunkHeader = new Uint32Array([binaryChunkData.byteLength, 0x004E4942]).buffer;
		const binaryChunk = GLTFUtil.join(binaryChunkHeader, binaryChunkData);

		const header = new Uint32Array([
			0x46546C67, 2, 12 + jsonChunk.byteLength + binaryChunk.byteLength
		]).buffer;

		return GLTFUtil.concat([header, jsonChunk, binaryChunk]);
	}
}

/**
 * I/O service for Node.js.
 *
 * Usage:
 *
 * ```typescript
 * const fs = require('fs');
 * const path = require('path');
 * const { WebIO } = require('@gltf-transform/core');
 *
 * const io = new NodeIO(fs, path);
 *
 * // Read.
 * io.read('model.glb');             // → Container
 * io.unpackGLB(ArrayBuffer);        // → Container
 *
 * // Write.
 * io.write('model.glb', container); // → void
 * io.packGLB(container);            // → ArrayBuffer
 * ```
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

	/** Loads a local path and returns a {@link Container} instance. */
	public read (uri: string): Container {
		const isGLB = !!uri.match(/\.glb$/);
		return isGLB ? this.readGLB(uri) : this.readGLTF(uri);
	}

	/** Writes a {@link Container} instance to a local path. */
	public write (uri: string, container: Container): void {
		const isGLB = !!uri.match(/\.glb$/);
		isGLB ? this.writeGLB(uri, container) : this.writeGLTF(uri, container);
	}

	/* Internal. */

	private readGLB (uri: string): Container {
		const buffer: Buffer = this.fs.readFileSync(uri);
		const arrayBuffer = GLTFUtil.trimBuffer(buffer);
		return this.unpackGLB(arrayBuffer);
	}

	private readGLTF (uri: string): Container {
		const dir = this.path.dirname(uri);
		const asset = {
			json: JSON.parse(this.fs.readFileSync(uri, 'utf8')),
			resources: {}
		} as Asset;
		const images = asset.json.images || [];
		const buffers = asset.json.buffers || [];
		[...images, ...buffers].forEach((resource: GLTF.IBuffer|GLTF.IImage) => {
			if (resource.uri && !resource.uri.match(/data:/)) {
				const absURI = this.path.resolve(dir, resource.uri);
				asset.resources[resource.uri] = GLTFUtil.trimBuffer(this.fs.readFileSync(absURI));
			} else {
				throw new Error('Embedded resources not implemented.');
			}
		})
		return GLTFReader.read(asset);
	}

	private writeGLTF (uri: string, container: Container): void {
		const writerOptions = {basename: GLTFUtil.basename(uri), isGLB: false};
		const {json, resources} = GLTFWriter.write(container, writerOptions);
		const {fs, path} = this;
		const dir = path.dirname(uri);
		fs.writeFileSync(uri, JSON.stringify(json, null, 2));
		Object.keys(resources).forEach((resourceName) => {
			const resource = new Buffer(resources[resourceName]);
			fs.writeFileSync(path.join(dir, resourceName), resource);
		});
	}

	private writeGLB (uri: string, container: Container): void {
		const buffer = Buffer.from(this.packGLB(container));
		this.fs.writeFileSync(uri, buffer);
	}
}

/**
 * I/O service for Web.
 *
 * Usage:
 *
 * ```typescript
 * import { WebIO } from '@gltf-transform/core';
 *
 * const io = new WebIO({credentials: 'include'});
 *
 * // Read.
 * const container = await io.read('model.glb'); // → Container
 * const container = io.unpackGLB(ArrayBuffer);  // → Container
 *
 * // Write.
 * const arrayBuffer = io.packGLB(container);    // → ArrayBuffer
 * ```
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

	/** Loads a URI and returns a {@link Container} instance. */
	public read (uri: string): Promise<Container> {
		const isGLB = !!uri.match(/\.glb$/);
		return isGLB ? this.readGLB(uri) : this.readGLTF(uri);
	}

	/* Internal. */

	private readGLTF (uri: string): Promise<Container> {
		const asset = {json: {}, resources: {}} as Asset;
		return fetch(uri, this.fetchConfig)
		.then((response) => response.json())
		.then((json: GLTF.IGLTF) => {
			asset.json = json;
			const pendingResources: Array<Promise<void>> = [...json.images, ...json.buffers]
			.map((resource: GLTF.IBuffer|GLTF.IImage) => {
				if (resource.uri) {
					return fetch(resource.uri, this.fetchConfig)
					.then((response) => response.arrayBuffer())
					.then((arrayBuffer) => {
						asset.resources[resource.uri] = arrayBuffer;
					});
				}
			});
			return Promise.all(pendingResources)
			.then(() => this.assetToContainer(asset));
		});
	}

	private readGLB (uri: string): Promise<Container> {
		return fetch(uri, this.fetchConfig)
			.then((response) => response.arrayBuffer())
			.then((arrayBuffer) => this.unpackGLB(arrayBuffer));
	}
}

export {NodeIO, WebIO};
