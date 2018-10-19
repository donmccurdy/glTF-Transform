interface IBufferMap { [s: string]: ArrayBuffer; }

/**
 * Wrapper for a glTF asset.
 */
class GLTFContainer {
  constructor(public json: GLTF.IGLTF, public resources: IBufferMap) {}

  /**
   * Resolves a resource URI.
   * @param uri
   */
  resolveURI(uri: string): ArrayBuffer {
    return this.resources[uri];
  }

  /**
   * Adds a new image to the glTF container.
   * @param container
   * @param name
   * @param file
   * @param type
   */
  addImage(name: string, file: ArrayBuffer, type: string): GLTFContainer {
    let uri, mimeType
    switch (type) {
      case 'image/jpeg':
        uri = `${name}.jpg`;
        mimeType = GLTF.ImageMimeType.JPEG;
        break;
      case 'image/png':
        uri = `${name}.png`;
        mimeType = GLTF.ImageMimeType.PNG;
        break;
      default:
        throw new Error(`Unsupported image type, "${type}".`);
    }
    this.json.images.push({ name, mimeType, uri });
    this.resources[uri] = file;
    return this;
  }

  /**
   * Removes an image from the glTF container. Fails if image is still in use.
   * @param container
   * @param index
   */
  removeImage(index: number): GLTFContainer {
    const textures = this.json.textures.filter((texture) => texture.source === index);
    if (textures.length) {
      throw new Error(`Image is in use by ${textures.length} textures and cannot be removed.`);
    }
    const image = this.json.images[index];
    const imageBuffer = this.resolveURI(image.uri);
    if (!imageBuffer) {
      throw new Error('No such image, or image is embedded.');
    }
    this.json.images.splice(index, 1);
    this.json.textures.forEach((texture) => {
      if (texture.source > index) texture.source--;
    });
    return this;
  }

  /**
   * Adds a new buffer to the glTF container.
   * @param container
   * @param name
   * @param buffer
   */
  addBuffer(name: string, buffer: ArrayBuffer): GLTFContainer {
    const uri = `${name}.bin`;
    this.json.buffers.push({ name, uri, byteLength: buffer.byteLength });
    this.resources[uri] = buffer;
    return this;
  }

  /**
   * Removes a buffer from the glTF container. Fails if buffer is still in use.
   * @param container
   * @param index
   */
  removeBuffer(index: number): GLTFContainer {
    const bufferViews = this.json.bufferViews.filter((view) => view.buffer === index);
    if (bufferViews.length) {
      throw new Error(`Buffer is in use by ${bufferViews.length} bufferViews and cannot be removed.`);
    }
    const buffer = this.json.buffers[index];
    this.json.buffers.splice(index, 1);
    delete this.resources[buffer.uri];
    return this;
  }

  addAccessor(array: Float32Array | Uint32Array | Uint16Array, type: GLTF.AccessorType, target: number): GLTFContainer {
    throw new Error('Not implemented.');
  }

  /**
   * Returns the accessor for the given index, as a typed array.
   * @param index
   */
  getAccessorArray(index: number): Float32Array | Uint32Array | Uint16Array {
    const accessor = this.json.accessors[index];
    const type = accessor.type;
    const bufferView = this.json.bufferViews[accessor.bufferView];
    const buffer = this.json.buffers[bufferView.buffer];
    const resource = this.resources[buffer.uri];

    let valueSize;
    switch (accessor.type) {
      case GLTF.AccessorType.VEC4:
        valueSize = 4;
        break;
      case GLTF.AccessorType.VEC3:
        valueSize = 3;
        break;
      case GLTF.AccessorType.VEC2:
        valueSize = 2;
        break;
      default:
        throw new Error(`Accessor type ${accessor.type} not implemented.`);
    }

    let elementSize;
    let data;
    switch (accessor.componentType) {
      case GLTF.AccessorComponentType.FLOAT:
        elementSize = Float32Array.BYTES_PER_ELEMENT;
        data = resource.slice(bufferView.byteOffset + accessor.byteOffset, accessor.count * valueSize * elementSize);
        return new Float32Array(data);
      case GLTF.AccessorComponentType.UNSIGNED_INT:
        elementSize = Uint32Array.BYTES_PER_ELEMENT;
        data = resource.slice(bufferView.byteOffset + accessor.byteOffset, accessor.count * valueSize * elementSize);
        return new Uint32Array(data);
      case GLTF.AccessorComponentType.UNSIGNED_SHORT:
        elementSize = Uint16Array.BYTES_PER_ELEMENT;
        data = resource.slice(bufferView.byteOffset + accessor.byteOffset, accessor.count * valueSize * elementSize);
        return new Uint16Array(data);
      default:
        throw new Error(`Accessor componentType ${accessor.componentType} not implemented.`);
    }
  }
}

export { GLTFContainer, IBufferMap };
