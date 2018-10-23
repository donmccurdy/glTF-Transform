import { GLTFContainer, IBufferMap } from './container';
import { Logger, LoggerVerbosity } from './logger';

/**
 * Utility class for glTF transforms.
 */
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
  static wrapGLB(glb: ArrayBuffer): GLTFContainer {
    // Decode and verify GLB header.
    const header = new Uint32Array(glb, 0, 3);
    if (header[0] !== 0x46546C67) {
      throw new Error('Invalid glTF asset.');
    } else if (header[1] !== 2) {
      throw new Error(`Unsupported glTF binary version, "${header[1]}".`);
    }

    // Decode and verify chunk headers.
    const jsonChunkHeader = new Uint32Array(glb, 12, 2);
    const binaryChunkHeader = new Uint32Array(glb, 12 + 8 + jsonChunkHeader[0], 2);
    if (jsonChunkHeader[1] !== 0x4E4F534A || binaryChunkHeader[1] !== 0x004E4942) {
      throw new Error('Unexpected GLB layout.');
    }

    // Decode content.
    const jsonByteOffset = 20;
    const jsonByteLength = jsonChunkHeader[0];
    const json = JSON.parse(this.decodeText(glb.slice(jsonByteOffset, jsonByteOffset + jsonByteLength)));
    const binaryByteOffset = 12 + 8 + jsonByteLength;
    const binaryByteLength = binaryChunkHeader[0];
    const binary = glb.slice(binaryByteOffset, binaryByteOffset + binaryByteLength);
    const buffer = json.buffers.find((b) => !b.uri);
    buffer.uri = 'resources.bin';

    // TODO(donmccurdy): Unpack embedded textures.
    // TODO(donmccurdy): Decode Draco content.

    return new GLTFContainer(json, {'resources.bin': binary});
  }

  /**
   * Serializes a GLTFContainer to GLTF JSON and external files.
   * @param container
   */
  static bundleGLTF(container: GLTFContainer): {json: Object, resources: IBufferMap} {
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
   * Creates an empty buffer.
   */
  static createBuffer(): ArrayBuffer {
    if (typeof Buffer === 'undefined') {
      // Browser.
      return new ArrayBuffer(0);
    } else {
      // Node.js.
      return new Buffer([]);
    }
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
      return new Buffer(dataURI.split(',')[1], 'base64');
    }
  }

  static createLogger(name: string, verbosity: LoggerVerbosity): Logger {
    return new Logger(name, verbosity);
  }

  static encodeText(text: string): ArrayBuffer {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(text);
    }
    return Buffer.from(text).buffer;
  }

  static decodeText(buffer: ArrayBuffer): string {
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder().decode(buffer);
    }
    const a = Buffer.from(buffer) as any; 
    return a.toString('utf8');
  }
}

export { GLTFUtil };
