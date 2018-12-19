import { AccessorTypeData, AccessorComponentType } from './constants';

interface IBufferMap { [s: string]: ArrayBuffer; }

interface IContainer {
  json: GLTF.IGLTF;
  getBuffer(bufferIndex: number): ArrayBuffer;
  setBuffer(bufferIndex: number, buffer: ArrayBuffer): void;
  validate(): void;
}

/**
 * Wrapper for a glTF asset.
 */
class GLTFContainer implements IContainer {
  constructor(public json: GLTF.IGLTF, public resources: IBufferMap) {}

  /**
   * Resolves a resource URI.
   * @param uri
   */
  resolveURI(uri: string): ArrayBuffer {
    return this.resources[uri];
  }

  getBuffer(bufferIndex: number): ArrayBuffer {
    return this.resolveURI(this.json.buffers[bufferIndex].uri);
  }

  setBuffer(bufferIndex: number, buffer: ArrayBuffer): void {
    this.resources[this.json.buffers[bufferIndex].uri] = buffer;
  }

  /**
   * Creates a deep copy of the asset.
   */
  clone(): GLTFContainer {
    const json = JSON.parse(JSON.stringify(this.json));
    const resources = {} as IBufferMap;
    for (const uri in this.resources) {
      const resource = this.resolveURI(uri);
      resources[uri] = resource.slice(0);
    }
    return new GLTFContainer(json, resources);
  }

  validate() {
    if (this.json.buffers.length > 1) {
      throw new Error(`Expected one buffer, found ${this.json.buffers.length}.`);
    }
    const embeddedImages = (this.json.images||[]).filter((image) => image.bufferView !== undefined);
    if (embeddedImages.length) {
      throw new Error(`Expected only external images, found ${embeddedImages.length} embedded.`)
    }
    const embeddedBuffers = this.json.buffers.filter((buffer) => buffer.uri === undefined);
    if (embeddedBuffers.length) {
      throw new Error(`Expected exactly one buffer, which should be external, and found ${embeddedBuffers.length} embedded.`)
    }
    for (var key in this.json) {
      if (Array.isArray(this.json[key]) && this.json[key].length === 0) {
        throw new Error(`Empty top-level array, "${this.json[key]}".`);
      }
    }
  }

  /**
   * Returns the accessor for the given index, as a typed array.
   * @param index
   */
  getAccessorArray(index: number): Float32Array | Uint32Array | Uint16Array | Uint8Array {
    const accessor = this.json.accessors[index];
    const bufferView = this.json.bufferViews[accessor.bufferView];
    const buffer = this.json.buffers[bufferView.buffer];
    const resource = this.resources[buffer.uri];

    const valueSize = AccessorTypeData[accessor.type].size;
    const start = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);

    let elementSize;
    let data;
    switch (accessor.componentType) {
      case AccessorComponentType.FLOAT:
        elementSize = Float32Array.BYTES_PER_ELEMENT;
        data = resource.slice(start, start + accessor.count * valueSize * elementSize);
        return new Float32Array(data);
      case AccessorComponentType.UNSIGNED_INT:
        elementSize = Uint32Array.BYTES_PER_ELEMENT;
        data = resource.slice(start, start + accessor.count * valueSize * elementSize);
        return new Uint32Array(data);
      case AccessorComponentType.UNSIGNED_SHORT:
        elementSize = Uint16Array.BYTES_PER_ELEMENT;
        data = resource.slice(start, start + accessor.count * valueSize * elementSize);
        return new Uint16Array(data);
        case AccessorComponentType.UNSIGNED_BYTE:
        elementSize = Uint8Array.BYTES_PER_ELEMENT;
        data = resource.slice(start, start + accessor.count * valueSize * elementSize);
        return new Uint8Array(data);
      default:
        throw new Error(`Accessor componentType ${accessor.componentType} not implemented.`);
    }
  }

  equals(other: GLTFContainer): boolean {
    if (JSON.stringify(this.json) !== JSON.stringify(other.json)) return false;
    if (Object.keys(this.resources).length !== Object.keys(other.resources).length) return false;
    for (const resourceName in this.resources) {
      const resource = Buffer.from(this.resources[resourceName]);
      const otherResource = Buffer.from(other.resources[resourceName]);
      if (!resource.equals(otherResource)) return false;
    }
    return true;
  }
}

export { GLTFContainer, IBufferMap, IContainer };
