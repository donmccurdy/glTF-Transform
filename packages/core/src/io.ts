import { GLTFUtil } from "./util";
import { GLTFContainer, IBufferMap } from "./container";
import { Container } from "./v2/container";

interface IO {
    read: (uri: string) => GLTFContainer|Promise<GLTFContainer>;
    read_v2: (uri: string) => Container|Promise<Container>;
}

class NodeIO implements IO {
    private fs: any;
    private path: any;

    constructor(fs, path) {
        this.fs = fs;
        this.path = path;
    }

    read (uri: string): GLTFContainer {
        const isGLB = !!uri.match(/\.glb$/);
        return isGLB ? this.readGLB(uri) : this.readGLTF(uri);
    }

    read_v2 (uri: string): Container {
        const isGLB = !!uri.match(/\.glb$/);
        return isGLB ? this.readGLB_v2(uri) : this.readGLTF_v2(uri);
    }

    private readGLB (uri: string): GLTFContainer {
        const buffer: Buffer = this.fs.readFileSync(uri);
        const arrayBuffer = GLTFUtil.trimBuffer(buffer);
        return GLTFUtil.fromGLB(arrayBuffer);
    }

    private readGLB_v2 (uri: string): Container {
        const buffer: Buffer = this.fs.readFileSync(uri);
        const arrayBuffer = GLTFUtil.trimBuffer(buffer);
        const {json, resources} = GLTFUtil.fromGLB(arrayBuffer);
        return Container.fromGLTF_v2(json, resources);
    }

    private readGLTF (uri: string): GLTFContainer {
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
        return GLTFUtil.fromGLTF(json, resources);
    }

    private readGLTF_v2 (uri: string): Container {
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
        return Container.fromGLTF_v2(json, resources);
    }

    write (uri: string, container: GLTFContainer): void {
        const isGLB = !!uri.match(/\.glb$/);
        isGLB ? this.writeGLB(uri, container) : this.writeGLTF(uri, container);
    }

    writeGLTF (uri: string, container: GLTFContainer, embedded?: boolean): void {
        if (embedded) {
            throw new Error('Not implemented.');
        }
        const {fs, path} = this;
        const dir = path.dirname(uri);
        const {json, resources} = container;
        fs.writeFileSync(uri, JSON.stringify(json));
        Object.keys(resources).forEach((resourceName) => {
          const resource = new Buffer(resources[resourceName]);
          fs.writeFileSync(path.join(dir, resourceName), resource);
        });
    }

    writeGLB (uri: string, container: GLTFContainer): void {
        const glbBuffer = GLTFUtil.toGLB(container);
        const buffer = Buffer.from(glbBuffer);
        this.fs.writeFileSync(uri, buffer);
    }
}

class WebIO implements IO {
    private fetchConfig: RequestInit;

    constructor(fetchConfig: RequestInit) {
        this.fetchConfig = fetchConfig;
    }

    read (uri: string): Promise<GLTFContainer> {
        const isGLB = !!uri.match(/\.glb$/);
        return isGLB ? this.readGLB(uri) : this.readGLTF(uri);
    }

    read_v2 (uri:string): Promise<Container> {
        throw new Error('Not implemented.');
    }

    private readGLTF (uri: string): Promise<GLTFContainer> {
        return fetch(uri, this.fetchConfig)
            .then((response) => response.json())
            .then((json: GLTF.IGLTF) => {
                const resources = {} as IBufferMap;
                const pendingResources: Array<Promise<void>> = [...json.images, ...json.buffers]
                    .map((resource: GLTF.IBuffer|GLTF.IImage) => {
                        if (resource.uri) {
                            return fetch(resource.uri, this.fetchConfig)
                                .then((response) => response.arrayBuffer())
                                .then((arrayBuffer) => {
                                    resources[resource.uri] = arrayBuffer;
                                });
                        } else {
                            throw new Error('Embedded resources not implemented.');
                        }
                    });
                return Promise.all(pendingResources)
                    .then(() => GLTFUtil.fromGLTF(json, resources));
            });
    }

    private readGLB (uri: string): Promise<GLTFContainer> {
        return fetch(uri, this.fetchConfig)
            .then((response) => response.arrayBuffer())
            .then((arrayBuffer) => GLTFUtil.fromGLB(arrayBuffer));
    }
}

export {NodeIO, WebIO};
