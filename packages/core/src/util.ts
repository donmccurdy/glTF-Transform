import { AccessorComponentType, AccessorComponentTypeData, AccessorTypeData, IBufferMap, NOT_IMPLEMENTED, TypedArray } from './constants';
import { Container } from './container';
import { Element, Root, Scene } from './elements/index';
import { Link } from './graph/index';
import { ISize } from './image-util';
import { Logger, LoggerVerbosity } from './logger';
import { uuid } from './uuid';

interface IGLTFAnalysis {
	meshes: number;
	textures: number;
	materials: number;
	animations: number;
	primitives: number;
	dataUsage: {
		geometry: number;
		targets: number;
		animation: number;
		textures: number;
		json: number;
	};
}

/**
* Utility class for glTF transforms.
*/
class GLTFUtil {
	static basename(path: string): string {
		// https://stackoverflow.com/a/15270931/1314762
		return path.split(/[\\/]/).pop();
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
		return Buffer.from(buffer).toString('utf8');
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

	static getImageSize(container: Container, index: number): ISize {
		throw NOT_IMPLEMENTED;
		// const image = container.json.images[index];
		// let isPNG;
		// if (image.mimeType) {
		//   isPNG = image.mimeType === 'image/png';
		// } else {
		//   isPNG = image.uri.match(/\.png$/);
		// }
		// const arrayBuffer = container.resolveURI(image.uri);
		// return isPNG
		//   ? getSizePNG(Buffer.from(arrayBuffer))
		//   : getSizeJPEG(Buffer.from(arrayBuffer));
	}

	/**
	* Returns the accessor for the given index, as a typed array.
	* @param index
	*/
	static getAccessorArray(index: number, json: GLTF.IGLTF, resources: IBufferMap): TypedArray {
		// TODO(donmccurdy): This is not at all robust. For a complete implementation, see:
		// https://github.com/mrdoob/three.js/blob/dev/examples/js/loaders/GLTFLoader.js#L1720

		const accessor = json.accessors[index];
		const bufferView = json.bufferViews[accessor.bufferView];
		const buffer = json.buffers[bufferView.buffer];
		const resource = resources[buffer.uri];

		const itemSize = AccessorTypeData[accessor.type].size;
		const start = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);

		bufferView.byteStride

		switch (accessor.componentType) {
			case AccessorComponentType.FLOAT:
			return new Float32Array(resource, start, accessor.count * itemSize);
			case AccessorComponentType.UNSIGNED_INT:
			return new Uint32Array(resource, start, accessor.count * itemSize);
			case AccessorComponentType.UNSIGNED_SHORT:
			return new Uint16Array(resource, start, accessor.count * itemSize);
			case AccessorComponentType.UNSIGNED_BYTE:
			return new Uint8Array(resource, start, accessor.count * itemSize);
			default:
			throw new Error(`Accessor componentType ${accessor.componentType} not implemented.`);
		}
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
	* Concatenates N ArrayBuffers.
	*/
	static concat (buffers: ArrayBuffer[]): ArrayBuffer {
		let totalByteLength = 0;
		for (const buffer of buffers) {
			totalByteLength += buffer.byteLength;
		}

		const result = new Uint8Array(totalByteLength);
		let byteOffset = 0;

		for (const buffer of buffers) {
			result.set(new Uint8Array(buffer), byteOffset);
			byteOffset += buffer.byteLength;
		}

		return result.buffer;
	}

	/**
	* Pad buffer to the next 4-byte boundary.
	* https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#data-alignment
	*/
	static pad (arrayBuffer: ArrayBuffer, paddingByte = 0): ArrayBuffer {

		const paddedLength = this.padNumber( arrayBuffer.byteLength );

		if ( paddedLength !== arrayBuffer.byteLength ) {

			const array = new Uint8Array( paddedLength );
			array.set( new Uint8Array( arrayBuffer ) );

			if ( paddingByte !== 0 ) {

				for ( let i = arrayBuffer.byteLength; i < paddedLength; i ++ ) {

					array[ i ] = paddingByte;

				}

			}

			return array.buffer;

		}

		return arrayBuffer;

	}

	static padNumber (v: number): number {

		return Math.ceil( v / 4 ) * 4;

	}

	static arrayBufferEquals(a: ArrayBuffer, b: ArrayBuffer): boolean {
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
		const nodes = []; // id, label, x, y, size, color
		const edges = []; // id, label, source, target

		function createNode (element: Element): void {
			if (idMap.get(element)) return;

			const id = uuid();
			idMap.set(element, id);

			nodes.push({
				id: id,
				size: 1,
				// TODO(donmccurdy): names get obfuscated
				label: `${element.constructor.name}: ${id} ${element.getName()}`
			});
		}

		const root = container.getRoot();
		createNode(root);
		root.listAccessors().forEach(createNode);
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
			edges.push({id: uuid(), label: link.getName(), source, target});
		})

		return {nodes, edges};
	}
}


export { GLTFUtil };
