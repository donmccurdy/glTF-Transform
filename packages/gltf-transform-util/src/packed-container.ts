import { GLTFContainer, IContainer, IBufferMap } from "./container";
import { GLTFUtil } from "./util";

class PackedGLTFContainer implements IContainer {
    constructor (public json: GLTF.IGLTF, public buffer: ArrayBuffer) {
    }
    getBuffer (bufferIndex: number): ArrayBuffer {
        if (bufferIndex !== 0) {
            throw new Error('Invalid buffer index.');
        }
        return this.buffer;
    }
    setBuffer (bufferIndex: number, buffer: ArrayBuffer) {
        if (bufferIndex !== 0) {
            throw new Error('Invalid buffer index.');
        }
        this.buffer = buffer;
    }
    validate () {
        if (this.json.buffers.length > 1) {
            throw new Error(`Expected 1 buffer, found ${this.json.buffers.length}.`);
        }
        const externalImages = (this.json.images||[]).filter((image) => image.uri !== undefined);
        const externalBuffers = this.json.buffers.filter((buffer) => buffer.uri !== undefined);
        if (externalImages.length || externalBuffers.length) {
            throw new Error('Found external resource references.');
        }
        for (var key in this.json) {
            if (Array.isArray(this.json[key]) && this.json[key].length === 0) {
                throw new Error(`Empty top-level array, "${this.json[key]}".`);
            }
        }
    }
    static pack(container: GLTFContainer): PackedGLTFContainer {
        container.validate();
        container = container.clone();
        const json = container.json;
        const buffer = container.resolveURI(container.json.buffers[0].uri);
        delete json.buffers[0].uri;
        const packedContainer = new PackedGLTFContainer(json, buffer);
        (json.images||[]).forEach((image) => {
            const imageData = container.resolveURI(image.uri);
            delete image.uri;
            GLTFUtil.addBufferView(packedContainer, imageData, 0);
            image.bufferView = json.bufferViews.length - 1;
        });
        packedContainer.validate();
        return packedContainer;
    }
    unpack(): GLTFContainer {
        const json = JSON.parse(JSON.stringify(this.json)) as GLTF.IGLTF;
        let buffer = this.buffer.slice(0);
        const resources = {'resources.bin': buffer} as IBufferMap;
        json.buffers[0].uri = 'resources.bin';
        const container = new GLTFContainer(json, resources);
        (json.images||[]).forEach((image, imageIndex) => {
            const bufferViewIndex = image.bufferView;
            const bufferView = json.bufferViews[bufferViewIndex];
            delete image.bufferView;
            const imageData = this.buffer.slice(bufferView.byteOffset, bufferView.byteLength);
            GLTFUtil.removeBufferView(this, bufferViewIndex);
            const extension = image.mimeType === 'image/jpeg' ? '.jpg' : '.png';
            image.uri = image.name ? image.name.replace(/\.\w+$/, '') + `.${extension}` : `image-${imageIndex}.${extension}`;
            resources[image.uri] = imageData;
        });
        container.validate();
        return container;
    }
}

export { PackedGLTFContainer };
