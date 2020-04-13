import { IBufferMap, NOT_IMPLEMENTED } from '../constants';
import { Container } from '../container';
import { GLTFUtil } from '../util';
import { GLTFReader } from './reader';
import { GLTFWriter } from './writer';

// TODO(donmccurdy): Writer should deal with resource packing and names.

/**
 * Platform-specific I/O service.
 *
 * Usage:
 *
 * - io.read('model.glb')             → Container
 * - io.write('model.glb', container) → void
 * - io.packGLB(container)            → ArrayBuffer
 * - io.unpackGLB(ArrayBuffer)        → Container
 */
abstract class PlatformIO {
	/** Converts a {@link Container} to glTF-formatted JSON and a resource map. */
	protected containerToResources (container: Container): {json: GLTF.IGLTF; resources: IBufferMap} {
		return GLTFWriter.write(container);
	}

	/** Converts glTF-formatted JSON and a resource map to a {@link Container}. */
	protected resourcesToContainer (json: GLTF.IGLTF, resources: IBufferMap): Container {
		return GLTFReader.read(json, resources);
	}

	/** Converts a GLB-formatted {@link ArrayBuffer} to a {@link Container}. */
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

		return this.resourcesToContainer(json, {'': binary} as IBufferMap);
	}

	/** Converts a {@link Container} to a GLB-formatted {@link ArrayBuffer}. */
	public packGLB(container: Container): ArrayBuffer {
		const {json, resources} = this.containerToResources(container);

		// TODO(donmccurdy): Writer should deal with resource packing and names.
		if (Object.values(resources).length !== 1) {
			throw new Error('Writing to GLB requires exactly 1 buffer.');
		} else {
			delete json.buffers[0].uri;
		}

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

class NodeIO extends PlatformIO {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	constructor(private readonly fs: any, private readonly path: any) {
		super();
	}

	/* Public. */

	public read (uri: string): Container {
		const isGLB = !!uri.match(/\.glb$/);
		return isGLB ? this.readGLB(uri) : this.readGLTF(uri);
	}

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
		const json: GLTF.IGLTF = JSON.parse(this.fs.readFileSync(uri, 'utf8'));
		const resources = {} as IBufferMap;
		const images = json.images || [];
		const buffers = json.buffers || [];
		[...images, ...buffers].forEach((resource: GLTF.IBuffer|GLTF.IImage) => {
			if (resource.uri && !resource.uri.match(/data:/)) {
				const absURI = this.path.resolve(dir, resource.uri);
				resources[resource.uri] = GLTFUtil.trimBuffer(this.fs.readFileSync(absURI));
			} else {
				throw new Error('Embedded resources not implemented.');
			}
		})
		return GLTFReader.read(json, resources);
	}

	private writeGLTF (uri: string, container: Container): void {
		const {json, resources} = GLTFWriter.write(container);
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

class WebIO extends PlatformIO {
	constructor(private readonly fetchConfig: RequestInit) {
		super();
	}

	/* Public. */

	public read (uri: string): Promise<Container> {
		const isGLB = !!uri.match(/\.glb$/);
		return isGLB ? this.readGLB(uri) : this.readGLTF(uri);
	}

	/* Internal. */

	private readGLTF (uri: string): Promise<Container> {
		throw NOT_IMPLEMENTED;
		// return fetch(uri, this.fetchConfig)
		// .then((response) => response.json())
		// .then((json: GLTF.IGLTF) => {
		// 	const resources = {} as IBufferMap;
		// 	const pendingResources: Array<Promise<void>> = [...json.images, ...json.buffers]
		// 	.map((resource: GLTF.IBuffer|GLTF.IImage) => {
		// 		if (resource.uri) {
		// 			return fetch(resource.uri, this.fetchConfig)
		// 			.then((response) => response.arrayBuffer())
		// 			.then((arrayBuffer) => {
		// 				resources[resource.uri] = arrayBuffer;
		// 			});
		// 		} else {
		// 			throw new Error('Embedded resources not implemented.');
		// 		}
		// 	});
		// 	return Promise.all(pendingResources)
		// 	.then(() => GLTFUtil.fromGLTF(json, resources));
		// });
	}

	private readGLB (uri: string): Promise<Container> {
		throw NOT_IMPLEMENTED;
		// return fetch(uri, this.fetchConfig)
		// .then((response) => response.arrayBuffer())
		// .then((arrayBuffer) => GLTFUtil.fromGLB(arrayBuffer));
	}
}

export {NodeIO, WebIO};
