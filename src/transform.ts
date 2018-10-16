import { GLTFContainer, IBufferMap } from './container';

class GLTFUtil {
  /**
   * Creates a GLTFContainer from the given JSON and files.
   * @param json
   * @param files
   */
  static wrapGLTF(json: GLTF.IGLTF, resources: IBufferMap) {
    return new GLTFContainer(json, resources);
  }

  /**
   * Creates a GLTFContainer from the given GLB binary.
   * @param glb
   */
  static wrapGLB(glb: ArrayBuffer) {
    throw new Error('Not implemented.');
  }

  /**
   * Serializes a GLTFContainer to GLTF JSON and external files.
   * @param container
   */
  static bundleGLTF(container: GLTFContainer) {
    const {json, resources} = container;
    return {json, resources};
  }

  /**
   * Serializes a GLTFContainer to a GLB binary.
   * @param container
   */
  static bundleGLB(container: GLTFContainer): ArrayBuffer {
    throw new Error('Not implemented.');
  }

  /**
   * Adds a new image to the glTF container.
   * @param container
   * @param name
   * @param file
   * @param type
   */
  static addImage(container: GLTFContainer, name: string, file: ArrayBuffer, type: string): GLTFContainer {
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
    container.json.images.push({ name, mimeType, uri });
    container.resources[uri] = file;
    return container;
  }

  /**
   * Removes an image from the glTF container. Fails if image is still in use.
   * @param container
   * @param index
   */
  static removeImage(container: GLTFContainer, index: number): GLTFContainer {
    const textures = container.json.textures.filter((texture) => texture.source === index);
    if (textures.length) {
      throw new Error(`Image is in use by ${textures.length} textures and cannot be removed.`);
    }
    const image = container.json.images[index];
    const imageBuffer = container.resolveURI(image.uri);
    if (!imageBuffer) {
      throw new Error('No such image, or image is embedded.');
    }
    container.json.images.splice(index, 1);
    container.json.textures.forEach((texture) => {
      if (texture.source > index) texture.source--;
    });
    return container;
  }

  /**
   * Adds a new buffer to the glTF container.
   * @param container
   * @param name
   * @param buffer
   */
  static addBuffer(
      container: GLTFContainer,
      name: string,
      buffer: ArrayBuffer): GLTFContainer {
    const uri = `${name}.bin`;
    container.json.buffers.push({name, uri, byteLength: buffer.byteLength});
    container.resources[uri] = buffer;
    return container;
  }

  /**
   * Removes a buffer from the glTF container. Fails if buffer is still in use.
   * @param container
   * @param index
   */
  static removeBuffer(
      container: GLTFContainer,
      index: number): GLTFContainer {
    const bufferViews = container.json.bufferViews.filter((view) => view.buffer === index);
    if (bufferViews.length) {
      throw new Error(`Buffer is in use by ${bufferViews.length} bufferViews and cannot be removed.`);
    }
    const buffer = container.json.buffers[index];
    container.json.buffers.splice(index, 1);
    delete container.resources[buffer.uri];
    return container;
  }
}

export { GLTFUtil };
