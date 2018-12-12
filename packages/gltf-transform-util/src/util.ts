import { GLTFContainer, IBufferMap } from './container';
import { Logger, LoggerVerbosity } from './logger';

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
    const buffer = json.buffers.filter((b) => !b.uri).pop();
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

  static getAccessorByteLength(accessor: GLTF.IAccessor): number {
    const itemSize = AccessorType[accessor.type].size;
    const valueSize = AccessorComponentType[accessor.componentType].size;
    return itemSize * valueSize * accessor.count;
  }
}

const AccessorType = {
  SCALAR: {value: 'SCALAR', size: 1},
  VEC2: {value: 'VEC2', size: 2},
  VEC3: {value: 'VEC3', size: 3},
  VEC4: {value: 'VEC4', size: 4},
  MAT2: {value: 'MAT2', size: 4},
  MAT3: {value: 'MAT3', size: 9},
  MAT4: {value: 'MAT4', size: 16},
}

const AccessorComponentType = {
  '5120': {value: 'BYTE', size: 1 },
  '5121': {value: 'UNSIGNED_BYTE', size: 1 },
  '5122': {value: 'SHORT', size: 2 },
  '5123': {value: 'UNSIGNED_SHORT', size: 2 },
  '5125': {value: 'UNSIGNED_INT', size: 4 },
  '5126': {value: 'FLOAT', size: 4 },
};

export { GLTFUtil };
