import { GLTFContainer, IBufferMap, IContainer } from "./container";

import { GLTFUtil } from "../util";

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
}

export { PackedGLTFContainer };
