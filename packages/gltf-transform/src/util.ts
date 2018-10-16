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
    throw new Error('Not implemented.');
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
}

export { GLTFUtil };
