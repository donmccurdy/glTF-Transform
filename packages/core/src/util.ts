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
    const jsonChunkData = this.pad( GLTFUtil.encodeText(jsonText), 0x20 );
    const jsonChunkHeader = new Uint32Array([jsonChunkData.byteLength, 0x4E4F534A]).buffer;
    const jsonChunk = this.join(jsonChunkHeader, jsonChunkData);

    const binaryChunkData = this.pad( container.getBuffer(0), 0x00 );
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
      images: (container.json.images||[]).length,
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
    delete container.resources[image.uri];
    return container;
  }

  /**
   * Removes a texture from the glTF container.
   * @param container
   * @param index
   */
  static removeTexture(container: GLTFContainer, index: number): GLTFContainer {
    container.json.materials.forEach((material) => {
      [
        material.emissiveTexture,
        material.normalTexture,
        material.occlusionTexture,
        material.pbrMetallicRoughness && material.pbrMetallicRoughness.baseColorTexture,
        material.pbrMetallicRoughness && material.pbrMetallicRoughness.metallicRoughnessTexture
      ].forEach((texture) => {
        if (texture.index === index) {
          throw new Error('Texture still in use.');
        } else if (texture.index > index) {
          texture.index--;
        }
      });
    });
    container.json.textures.splice(index, 1);
    return container;
  }

  /**
   * Adds a new buffer to the glTF container.
   * @param container
   * @param name
   * @param buffer
   */
  static addBuffer(container: GLTFContainer, name: string, arrayBuffer: ArrayBuffer): GLTF.IBuffer {
    const uri = `${name}.bin`;
    const buffer = { name, uri, byteLength: arrayBuffer.byteLength };
    container.json.buffers.push(buffer);
    container.resources[uri] = arrayBuffer;
    return buffer;
  }

  /**
   * Removes a buffer from the glTF container. Fails if buffer is still in use.
   * @param container
   * @param index
   */
  static removeBuffer(container: GLTFContainer, index: number): GLTF.IBuffer {
    const bufferViews = container.json.bufferViews.filter((view) => view.buffer === index);
    if (bufferViews.length) {
      throw new Error(`Buffer is in use by ${bufferViews.length} bufferViews and cannot be removed.`);
    }
    const buffer = container.json.buffers[index];
    container.json.buffers.splice(index, 1);
    delete container.resources[buffer.uri];
    container.json.bufferViews.forEach((bufferView) => {
      if (bufferView.buffer >= index) bufferView.buffer--;
    });
    return buffer;
  }

  static addBufferView(container: IContainer, arrayBuffer: ArrayBuffer, bufferIndex: number = 0): GLTF.IBufferView {
    const buffer = container.json.buffers[bufferIndex];
    let resource = container.getBuffer(bufferIndex);
    const byteOffset = resource.byteLength;
    resource = GLTFUtil.join(resource, arrayBuffer)
    container.setBuffer(bufferIndex, resource);
    buffer.byteLength = resource.byteLength;
    const bufferView: GLTF.IBufferView = {buffer: bufferIndex, byteLength: arrayBuffer.byteLength, byteOffset};
    container.json.bufferViews.push(bufferView);
    return bufferView;
  }

  /** Removes bufferView, after checking to see whether it is used by any accessors. */
  static removeBufferView(container: IContainer, bufferViewIndex: number): GLTF.IBufferView {
    const bufferView = container.json.bufferViews[bufferViewIndex];
    const accessors = container.json.accessors.filter((accessor) => accessor.bufferView === bufferViewIndex);
    if (accessors.length) {
      throw new Error(`Buffer is in use by ${accessors.length} accessors and cannot be removed.`);
    }

    if (bufferView.byteLength > 0) {
      let resource = container.getBuffer(bufferView.buffer);
      [resource] = this.splice(resource, bufferView.byteOffset, bufferView.byteLength);
      container.setBuffer(bufferView.buffer, resource);
      const buffer = container.json.buffers[bufferView.buffer];
      buffer.byteLength -= bufferView.byteLength;

      container.json.bufferViews.forEach((bufferView) => {
        if (bufferView.byteOffset > bufferView.byteOffset) {
          bufferView.byteOffset -= bufferView.byteLength;
        }
      });
    }

    container.json.bufferViews.splice(bufferViewIndex, 1);
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

  /**
   * Removes accessor, without checking to see whether it is used.
   *
   * - NOTE: Cannot currently update nonmesh accessors, which will lead to bugs.
   */
  static removeAccessor(container: GLTFContainer, index: number): GLTF.IAccessor {
    if ((container.json.animations||[]).length > 0) {
      throw new Error('Not implemented: cannot remove accessors from animated models.');
    }

    const accessor = container.json.accessors[index];
    const byteOffset = accessor.byteOffset || 0;
    const byteLength = GLTFUtil.getAccessorByteLength(accessor);
    if (byteLength) {
      this.spliceBufferView(container, accessor.bufferView, byteOffset, byteLength);
    }

    // remove accessor from JSON
    container.json.accessors.splice(index, 1);

    // update byteOffset of other accessors
    container.json.accessors.forEach((otherAccessor) => {
      if (otherAccessor.bufferView === accessor.bufferView && (otherAccessor.byteOffset||0) > byteOffset) {
        otherAccessor.byteOffset -= byteLength;
      }
    });

    // update pointers into following accessors
    container.json.meshes.forEach((mesh) => {
      mesh.primitives.forEach((primitive) => {
        for (let semantic in primitive.attributes) {
          if (primitive.attributes[semantic] === index) {
            throw new Error('Unexpected accessor use.');
          } else if (primitive.attributes[semantic] > index) {
            primitive.attributes[semantic]--;
          }
        }
        if (primitive.indices === index) {
          throw new Error('Unexpected accessor use.');
        } else if (primitive.indices > index) {
          primitive.indices--;
        }
      });
    });

    return accessor;
  }

  /**
   * Removes data from a bufferView, updating other affected bufferviews.
   *
   * - Does not check for existing uses.
   * - Does not update any accessors.
   */
  static spliceBufferView(container: GLTFContainer, bufferViewIndex: number, byteOffset: number, byteLength: number): ArrayBuffer {
    const bufferView = container.json.bufferViews[bufferViewIndex];
    let bufferData = container.getBuffer(bufferView.buffer);
    let splicedData;
    [bufferData, splicedData] = GLTFUtil.splice(bufferData, (bufferView.byteOffset||0) + byteOffset, byteLength);
    container.setBuffer(bufferView.buffer, bufferData);
    container.json.buffers[bufferView.buffer].byteLength -= byteLength; // TODO: do this when setBuffer is called?
    bufferView.byteLength -= byteLength;
    container.json.bufferViews.forEach((otherBufferView) => {
      if (bufferView.buffer === otherBufferView.buffer && (bufferView.byteOffset||0) < (otherBufferView.byteOffset||0)) {
        otherBufferView.byteOffset -= byteLength;
      }
    });
    return splicedData;
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

  /**
   * Pad buffer to the next 4-byte boundary.
   * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#data-alignment
   */
  static pad (arrayBuffer: ArrayBuffer, paddingByte: number): ArrayBuffer {

    paddingByte = paddingByte || 0;

    var paddedLength = Math.ceil( arrayBuffer.byteLength / 4 ) * 4;

    if ( paddedLength !== arrayBuffer.byteLength ) {

      var array = new Uint8Array( paddedLength );
      array.set( new Uint8Array( arrayBuffer ) );

      if ( paddingByte !== 0 ) {

        for ( var i = arrayBuffer.byteLength; i < paddedLength; i ++ ) {

          array[ i ] = paddingByte;

        }

      }

      return array.buffer;

    }

    return arrayBuffer;

  }

  static arrayBufferEquals(a: ArrayBuffer, b: ArrayBuffer) {
    if (a === b) return true;

    if (a.byteLength !== b.byteLength) return false;

    const view1 = new DataView(a);
    const view2 = new DataView(b);

    let i = a.byteLength;
    while (i--) {
      if (view1.getUint8(i) !== view2.getUint8(i)) return false;
    }

    return true;
  }
}

export { GLTFUtil };
