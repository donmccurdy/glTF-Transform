import { IBufferMap, NOT_IMPLEMENTED } from '../constants';
import { Container } from '../container';
import { GLTFUtil } from '../util';
import { GLTFReader } from './reader';
import { GLTFWriter } from './writer';

interface PlatformIO {
	read: (uri: string) => Container|Promise<Container>;
}

class NodeIO implements PlatformIO {
	private fs: any;
	private path: any;

	constructor(fs, path) {
		this.fs = fs;
		this.path = path;
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
		const {json, resources} = GLTFUtil.fromGLB(arrayBuffer);
		return GLTFReader.read(json, resources);
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
		const {json, resources} = GLTFWriter.write(container);
		const glbBuffer = GLTFUtil.toGLB(json, resources);
		const buffer = Buffer.from(glbBuffer);
		this.fs.writeFileSync(uri, buffer);
	}
}

class WebIO implements PlatformIO {
	private fetchConfig: RequestInit;

	constructor(fetchConfig: RequestInit) {
		this.fetchConfig = fetchConfig;
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
