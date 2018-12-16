import { AccessorComponentTypeData, AccessorTypeData } from './constants';
import { GLTFContainer, IBufferMap, IContainer } from './container';
import { Logger, LoggerVerbosity } from './logger';
import { PackedGLTFContainer } from './packed-container';

interface IGLTFAnalysis {
  meshes: number,
  textures: number,
  materials: number,
  animations: number,
  primitives: number,
  dataUsage: {
    geometry: number,
    targets: number,
    animation: number,
    textures: number,
    json: number
  }
};

/**
 * Utility class for glTF transforms.
 */
class GLTFUtil {
  /**
   * Creates a GLTFContainer from the given JSON and files.
   * @param json
   * @param files
   */
  static fromGLTF(json: GLTF.IGLTF, resources: IBufferMap) {
    return new GLTFContainer(json, resources);
  }

  /**
   * Creates a GLTFContainer from the given GLB binary.
   * @param glb
   */
  static fromGLB(glb: ArrayBuffer): GLTFContainer {
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
    const jsonText = this.decodeText(glb.slice(jsonByteOffset, jsonByteOffset + jsonByteLength));
    const json = JSON.parse(jsonText) as GLTF.IGLTF;
    const binaryByteOffset = jsonByteOffset + jsonByteLength + 8;
    const binaryByteLength = binaryChunkHeader[0];
    const binary = glb.slice(binaryByteOffset, binaryByteOffset + binaryByteLength);

    return new PackedGLTFContainer(json, binary).unpack();
  }

  /**
   * Serializes a GLTFContainer to GLTF JSON and external files.
   * @param container
   */
  static toGLTF(container: GLTFContainer): {json: Object, resources: IBufferMap} {
    const {json, resources} = container;
    return {json, resources};
  }

  /**
   * Serializes a GLTFContainer to a GLB binary.
   * @param container
   */
  static toGLB(container: IContainer): ArrayBuffer {
    if (container instanceof GLTFContainer) {
      container = PackedGLTFContainer.pack(container);
    }

    const jsonText = JSON.stringify(container.json);
    const jsonChunkData = GLTFUtil.encodeText(jsonText);
    const jsonChunkHeader = new Uint32Array([jsonChunkData.byteLength, 0x4E4F534A]).buffer;
    const jsonChunk = this.join(jsonChunkHeader, jsonChunkData);

    const binaryChunkData = container.getBuffer(0);
    const binaryChunkHeader = new Uint32Array([binaryChunkData.byteLength, 0x004E4942]).buffer;
    const binaryChunk = this.join(binaryChunkHeader, binaryChunkData);

    const header = new Uint32Array([0x46546C67, 2, 12 + jsonChunk.byteLength + binaryChunk.byteLength]).buffer;
    return this.join(this.join(header, jsonChunk), binaryChunk);
  }

  /**
   * Creates a buffer from a Data URI.
   * @param dataURI
   */
  static createBufferFromDataURI(dataURI: string): ArrayBuffer {
    if (typeof Buffer === 'undefined') {
      // Browser.
      const byteString = atob(dataURI.split(',')[1]);
      const ia = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      return ia.buffer;
    } else {
      // Node.js.
      return new Buffer(dataURI.split(',')[1], 'base64').buffer;
    }
  }

  static createLogger(name: string, verbosity: LoggerVerbosity): Logger {
    return new Logger(name, verbosity);
  }

  static encodeText(text: string): ArrayBuffer {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(text).buffer;
    }
    return this.trimBuffer(Buffer.from(text));
  }

  static decodeText(buffer: ArrayBuffer): string {
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder().decode(buffer);
    }
    const a = Buffer.from(buffer) as any; 
    return a.toString('utf8');
  }

  static trimBuffer(buffer: Buffer): ArrayBuffer {
    const {byteOffset, byteLength} = buffer;
    return buffer.buffer.slice(byteOffset, byteOffset + byteLength);
  }

  static analyze(container: GLTFContainer): IGLTFAnalysis {
    const report = {
      meshes: (container.json.meshes||[]).length,
      textures: (container.json.textures||[]).length,
      materials: (container.json.materials||[]).length,
      animations: (container.json.animations||[]).length,
      primitives: 0,
      dataUsage: {
        geometry: 0,
        targets: 0,
        animation: 0,
        textures: 0,
        json: 0
      }
    };

    // Primitives and targets.
    (container.json.meshes||[]).forEach((mesh) => {
      report.primitives += mesh.primitives.length;
      mesh.primitives.forEach((primitive) => {
        if (primitive.indices !== undefined) {
          report.dataUsage.geometry += this.getAccessorByteLength(container.json.accessors[primitive.indices]);
        }
        Object.keys(primitive.attributes).forEach((attr) => {
          const accessor = container.json.accessors[primitive.attributes[attr]];
          report.dataUsage.geometry += this.getAccessorByteLength(accessor);
        });

        (primitive.targets||[]).forEach((target) => {
          Object.keys(target).forEach((attr) => {
            const accessor = container.json.accessors[target[attr]];
            report.dataUsage.targets += this.getAccessorByteLength(accessor);
          });
        });
      });
    });

    // Animation
    (container.json.animations||[]).forEach((animation) => {
      animation.samplers.forEach((sampler) => {
        const input = container.json.accessors[sampler.input];
        const output = container.json.accessors[sampler.output];
        report.dataUsage.animation += this.getAccessorByteLength(input);
        report.dataUsage.animation += this.getAccessorByteLength(output);
      });
    });

    // Textures
    (container.json.images||[]).forEach((image) => {
      if (image.uri !== undefined) {
        report.dataUsage.textures += container.resolveURI(image.uri).byteLength;
      } else {
        report.dataUsage.textures += container.json.bufferViews[image.bufferView].byteLength;
      }
    });

    // JSON
    report.dataUsage.json += JSON.stringify(container.json).length;

    return report;
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
        mimeType = 'image/jpeg';
        break;
      case 'image/png':
        uri = `${name}.png`;
        mimeType = 'image/png';
        break;
      default:
        throw new Error(`Unsupported image type, "${type}".`);
    }
    container.json.images = container.json.images || [];
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
  static addBuffer(container: GLTFContainer, name: string, buffer: ArrayBuffer): GLTFContainer {
    const uri = `${name}.bin`;
    container.json.buffers.push({ name, uri, byteLength: buffer.byteLength });
    container.resources[uri] = buffer;
    return container;
  }

  /**
   * Removes a buffer from the glTF container. Fails if buffer is still in use.
   * @param container
   * @param index
   */
  static removeBuffer(container: GLTFContainer, index: number): GLTFContainer {
    const bufferViews = container.json.bufferViews.filter((view) => view.buffer === index);
    if (bufferViews.length) {
      throw new Error(`Buffer is in use by ${bufferViews.length} bufferViews and cannot be removed.`);
    }
    const buffer = container.json.buffers[index];
    container.json.buffers.splice(index, 1);
    delete container.resources[buffer.uri];
    return container;
  }

  static addBufferView(container: IContainer, arrayBuffer: ArrayBuffer, bufferIndex: number = 0): GLTF.IBufferView {
    const buffer = container.json.buffers[0];
    const resource = container.getBuffer(bufferIndex);
    const byteOffset = resource.byteLength;
    container.setBuffer(bufferIndex, GLTFUtil.join(resource, arrayBuffer));
    buffer.byteLength = resource.byteLength;
    const bufferView: GLTF.IBufferView = {buffer: 0, byteLength: arrayBuffer.byteLength, byteOffset};
    return bufferView;
  }

  static removeBufferView(container: IContainer, bufferViewIndex: number): GLTF.IBufferView {
    const bufferView = container.json.bufferViews[bufferViewIndex];
    const accessors = container.json.accessors.filter((accessor) => accessor.bufferView === bufferViewIndex);
    if (accessors.length) {
      throw new Error(`Buffer is in use by ${accessors.length} accessors and cannot be removed.`);
    }
    let resource = container.getBuffer(bufferView.buffer);
    [resource] = this.splice(resource, bufferView.byteOffset, bufferView.byteLength);
    container.setBuffer(bufferView.buffer, resource);
    container.json.bufferViews.splice(bufferViewIndex, 1);
    container.json.bufferViews.forEach((bufferView) => {
      if (bufferView.byteOffset > bufferView.byteOffset) {
        bufferView.byteOffset -= bufferView.byteLength;
      }
    });
    container.json.accessors.forEach((accessor) => {
      if (accessor.bufferView > bufferViewIndex) accessor.bufferView--;
    });
    return bufferView;
  }

  static addAccessor(
      container: GLTFContainer, 
      array: Float32Array | Uint32Array | Uint16Array,
      type: GLTF.AccessorType,
      componentType: GLTF.AccessorComponentType,
      count: number,
      target: number): GLTF.IAccessor {
    const bufferView = this.addBufferView(container, array.buffer, 0);
    bufferView['target'] = target; // TODO: Add to typings.
    const accessor: GLTF.IAccessor = {
      bufferView: container.json.bufferViews.length - 1,
      byteOffset: 0,
      type,
      componentType,
      count
    };
    container.json.accessors.push(accessor);
    return accessor;
  }

  static getAccessorByteLength(accessor: GLTF.IAccessor): number {
    const itemSize = AccessorTypeData[accessor.type].size;
    const valueSize = AccessorComponentTypeData[accessor.componentType].size;
    return itemSize * valueSize * accessor.count;
  }

  /**
   * Removes segment from an arraybuffer, returning two arraybuffers: [original, removed].
   */
  static splice (buffer: ArrayBuffer, begin: number, count: number): Array<ArrayBuffer> {
    const a1 = buffer.slice(0, begin);
    const a2 = buffer.slice(begin + count);
    const a = this.join(a1, a2);
    const b = buffer.slice(begin, begin + count);
    return [a, b];
  }

  /** Joins two ArrayBuffers. */
  static join (a: ArrayBuffer, b: ArrayBuffer): ArrayBuffer {
    const out = new Uint8Array(a.byteLength + b.byteLength);
    out.set(new Uint8Array(a), 0);
    out.set(new Uint8Array(b), a.byteLength);
    return out.buffer;
  }
}

export { GLTFUtil };
