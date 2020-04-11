import { AccessorComponentTypeData, AccessorTypeData } from './constants';
import { Element, Root, Scene } from './elements/index';
import { Link } from './graph/index';
import { ISize, getSizeJPEG, getSizePNG } from './image-util';
import { Logger, LoggerVerbosity } from './logger';
import { uuid } from './uuid';
import { GLTFContainer, IBufferMap, IContainer } from './v1/container';
import { Container } from './v2/container';

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

    return new GLTFContainer(json, {'': binary} as IBufferMap);
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
    // if (container instanceof GLTFContainer) {
    //   container = PackedGLTFContainer.pack(container);
    // }

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

  static analyze(container: Container): IGLTFAnalysis {
    const root = container.getRoot();

    const report = {
      meshes: root.listMeshes().length,
      textures: root.listTextures().length,
      materials: root.listMaterials().length,
      animations: -1,
      primitives: -1,
      dataUsage: {
        geometry: -1,
        targets: -1,
        animation: -1,
        textures: -1,
        json: -1
      }
    };

    return report;
  }

  static getImageSize(container: GLTFContainer, index: number): ISize {
    const image = container.json.images[index];
    let isPNG;
    if (image.mimeType) {
      isPNG = image.mimeType === 'image/png';
    } else {
      isPNG = image.uri.match(/\.png$/);
    }
    const arrayBuffer = container.resolveURI(image.uri);
    return isPNG
      ? getSizePNG(Buffer.from(arrayBuffer))
      : getSizeJPEG(Buffer.from(arrayBuffer));
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

  static toGraph(container: Container): object {
    const idMap = new Map<Element, string>();
    const nodes = []; // id, size, x, y, label, color
    const edges = []; // id, source, target

    function createNode (element: Element) {
      if (idMap.get(element)) return;

      const id = uuid();
      idMap.set(element, id);

      nodes.push({
        id: id,
        size: 1,
        label: `${element.constructor.name}: ${id} ${element.getName()}` // TODO(donmccurdy): names get obfuscated
      });
    }

    const root = container.getRoot();
    createNode(root);
    root.listAccessors().forEach(createNode);
    root.listBufferViews().forEach(createNode);
    root.listBuffers().forEach(createNode);
    root.listMaterials().forEach(createNode);
    root.listMeshes().forEach(createNode);
    root.listMeshes().forEach((mesh) => mesh.listPrimitives().forEach(createNode));
    root.listNodes().forEach(createNode);
    root.listScenes().forEach(createNode);
    root.listTextures().forEach(createNode);

    const graph = container.getGraph();
    graph.getLinks().forEach((link: Link<Element, Element>) => {
      const source = idMap.get(link.getLeft());
      const target = idMap.get(link.getRight());
      if ((link.getLeft() instanceof Root) && !(link.getRight() instanceof Scene)) {
        return;
      }
      edges.push({id: uuid(), source, target}); // TODO(donmccurdy): labels would be nice
    })

    return {nodes, edges};
  }
}

export { GLTFUtil };
