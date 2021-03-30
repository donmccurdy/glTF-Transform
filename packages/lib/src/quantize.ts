import { Accessor, Animation, Document, GLTF, Mesh, Node, Transform, vec2, vec3 } from '@gltf-transform/core';
import { MeshQuantization } from '@gltf-transform/extensions';

const NAME = 'quantize';

type TypedArrayConstructor = Int8ArrayConstructor
	| Int16ArrayConstructor
	| Uint8ArrayConstructor
	| Uint16ArrayConstructor;
const SIGNED_INT = [Int8Array, Int16Array, Int32Array] as TypedArrayConstructor[];

export interface QuantizeOptions {
	excludeAttributes?: string[];
	position?: number;
	normal?: number;
	texcoord?: number;
	color?: number;
	weight?: number;
	generic?: number;
}

export const QUANTIZE_DEFAULTS: QuantizeOptions =  {
	excludeAttributes: [],
	position: 14,
	normal: 10,
	texcoord: 12,
	color: 8,
	weight: 8,
	generic: 12,
};

/**
 * Quantize vertex attributes with `KHR_mesh_quantization`.
 *
 * References:
 * - https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_mesh_quantization
 * - http://www.aclockworkberry.com/normal-unpacking-quantization-errors/
 * - https://www.mathworks.com/help/dsp/ref/uniformencoder.html
 * - https://oroboro.com/compressed-unit-vectors/
 */
const quantize = (options: QuantizeOptions = QUANTIZE_DEFAULTS): Transform => {

	options = {...QUANTIZE_DEFAULTS, ...options};

	return (doc: Document): void => {
		const logger = doc.getLogger();

		doc.createExtension(MeshQuantization).setRequired(true);

		for (const mesh of doc.getRoot().listMeshes()) {
			quantizeMesh(doc, mesh, options);
		}

		logger.debug(`${NAME}: Complete.`);
	};

};

function quantizeMesh(
		doc: Document,
		mesh: Mesh,
		options: QuantizeOptions): void {

	const logger = doc.getLogger();
	const {nodeRemap, nodeOffset, nodeScale} = getNodeQuantizationTransforms(mesh);

	for (const primitive of mesh.listPrimitives()) {
		for (const semantic of primitive.listSemantics()) {
			if (options.excludeAttributes.includes(semantic)) continue;

			const attribute = primitive.getAttribute(semantic);
			const min = attribute.getMinNormalized([]);
			const max = attribute.getMinNormalized([]);

			let bits: number;
			let ctor: TypedArrayConstructor;

			// TODO(cleanup): Factor this out into a method or mapping.
			if (semantic === 'POSITION') {
				bits = options.position;
				ctor = bits <= 8 ? Int8Array : Int16Array;
			} else if (semantic === 'NORMAL' || semantic === 'TANGENT') {
				bits = options.normal;
				ctor = bits <= 8 ? Int8Array : Int16Array;
			} else if (semantic.startsWith('COLOR_')) {
				bits = options.color;
				ctor = bits <= 8 ? Uint8Array : Uint16Array;
			} else if (semantic.startsWith('TEXCOORD_')) {
				if (min.some(v => v < 0) || max.some(v => v > 1)) {
					logger.warn(`${NAME}: Skipping ${semantic}; out of supported range.`);
					continue;
				}
				bits = options.texcoord;
				ctor = bits <= 8 ? Uint8Array : Uint16Array;
			} else if (semantic.startsWith('JOINTS_')) {
				bits = Math.max(...attribute.getMax([])) <= 255 ? 8 : 16;
				ctor = bits <= 8 ? Uint8Array : Uint16Array;
				if (attribute.getComponentSize() > bits / 8) {
					attribute.setArray(new ctor(attribute.getArray()));
				}
				continue;
			} else if (semantic.startsWith('WEIGHTS_')) {
				if (min.some(v => v < 0) || max.some(v => v > 1)) {
					logger.warn(`${NAME}: Skipping ${semantic}; out of supported range.`);
					continue;
				}
				bits = options.weight;
				ctor = bits <= 8 ? Uint8Array : Uint16Array;
			} else if (semantic.startsWith('_')) {
				if (min.some(v => v < -1) || max.some(v => v > 1)) {
					logger.warn(`${NAME}: Skipping ${semantic}; out of supported range.`);
					continue;
				}
				bits = options.generic;
				ctor = min.some(v => v < 0)
					? (ctor = bits <= 8 ? Int8Array : Int16Array)
					: (ctor = bits <= 8 ? Uint8Array : Uint16Array);
			}

			if (bits < 8 || bits > 16) {
				throw new Error(`${NAME}: Quantization bits must be 8–16, inclusive.`);
			}

			// No changes if the storage is already as good as requested bit depth.
			if (attribute.getComponentSize() <= bits / 8) return;

			// Write quantization transform for position data into mesh parents.
			if (semantic === 'POSITION') {
				transformMeshParents(doc, mesh, nodeOffset || [0, 0, 0], nodeScale || [1, 1, 1]);
				for (let i = 0, el = [], il = attribute.getCount(); i < il; i++) {
					attribute.setElement(i, nodeRemap(attribute.getElement(i, el)));
				}
			}

			// Quantize the vertex attribute.
			quantizeAttribute(attribute, ctor, bits);
			attribute.setNormalized(true);

			// If we're storing normalized data quantized to fewer bits than the component storage
			// would allow, scale up by a power of two accordingly.
			if (bits < ctor.BYTES_PER_ELEMENT * 8) {
				const elScale = Math.pow(2, ctor.BYTES_PER_ELEMENT * 8 - bits);
				for (let i = 0, el = [], il = attribute.getCount(); i < il; i++) {
					attribute.getElement(i, el);
					for (let j = 0; j < el.length; j++) el[j] *= elScale;
					attribute.setElement(i, el);
				}
			}
		}
	}
}

/** Computes total min and max of all Accessors in a list. */
function flatBounds<T = vec2 | vec3>(targetMin: T, targetMax: T, accessors: Accessor[]): void {
	const elementSize = accessors[0].getElementSize();
	for (let i = 0; i < elementSize; i++) targetMin[i] = Infinity;
	for (let i = 0; i < elementSize; i++) targetMax[i] = -Infinity;

	const tmpMin = [];
	const tmpMax = [];

	for (const accessor of accessors) {
		accessor.getMinNormalized(tmpMin);
		accessor.getMaxNormalized(tmpMax);
		for (let i = 0; i < elementSize; i++) {
			targetMin[i] = Math.min(targetMin[i], tmpMin[i]);
			targetMax[i] = Math.max(targetMax[i], tmpMax[i]);
		}
	}
}

/** Computes node quantization transforms in local space. */
function getNodeQuantizationTransforms(mesh: Mesh): {
	nodeRemap: (v: number[]) => number[], nodeOffset: vec3, nodeScale: vec3
} {
	const positions = mesh.listPrimitives()
		.map((prim) => prim.getAttribute('POSITION'));

	if (!positions.some((p) => !!p)) return {nodeRemap: null, nodeOffset: null, nodeScale: null};

	const positionMin = [Infinity, Infinity, Infinity] as vec3;
	const positionMax = [-Infinity, -Infinity, -Infinity] as vec3;
	flatBounds<vec3>(positionMin, positionMax, positions);
	const nodeRemap = (v: number[]) => [
		(-1) + (1 - (-1)) * (v[0] - positionMin[0]) / (positionMax[0] - positionMin[0]),
		(-1) + (1 - (-1)) * (v[1] - positionMin[1]) / (positionMax[1] - positionMin[1]),
		(-1) + (1 - (-1)) * (v[2] - positionMin[2]) / (positionMax[2] - positionMin[2]),
	];
	const nodeOffset: vec3 = [
		positionMin[0] + (positionMax[0] - positionMin[0]) / 2,
		positionMin[1] + (positionMax[1] - positionMin[1]) / 2,
		positionMin[2] + (positionMax[2] - positionMin[2]) / 2,
	];
	const nodeScale: vec3 = [
		(positionMax[0] - positionMin[0]) / 2,
		(positionMax[1] - positionMin[1]) / 2,
		(positionMax[2] - positionMin[2]) / 2,
	];
	return {nodeRemap, nodeOffset, nodeScale};
}

/** Applies corrective scale and offset to nodes referencing a quantized Mesh. */
function transformMeshParents(doc: Document, mesh: Mesh, offset: vec3, scale: vec3): void {
	for (const parent of mesh.listParents()) {
		if (parent instanceof Node) {
			const isParentNode = parent.listChildren().length > 0;
			const isAnimated = !!parent.listParents().find((p) => p instanceof Animation);

			let targetNode: Node;

			if (isParentNode || isAnimated) {
				targetNode = doc.createNode('').setMesh(mesh);
				parent.addChild(targetNode).setMesh(null);
			} else {
				targetNode = parent;
			}

			const t = targetNode.getTranslation();
			const s = targetNode.getScale();
			targetNode
				.setTranslation([t[0] + offset[0], t[1] + offset[1], t[2] + offset[2]])
				.setScale([s[0] * scale[0], s[1] * scale[1], s[2] * scale[2]]);
		}
	}
}

/** Quantizes an attribute to the given parameters. */
function quantizeAttribute(
		attribute: Accessor,
		ctor: TypedArrayConstructor,
		bits: number
	): void {

	const dstArray = new ctor(attribute.getArray().length);
	const dstScale = (Math.pow(2, bits) - 1) * (SIGNED_INT.includes(ctor) ? 0.5 : 1);

	for (let i = 0, di = 0, el = []; i < attribute.getCount(); i++) {
		attribute.getElement(i, el);
		for (let j = 0; j < el.length; j++) {
			dstArray[di++] = (el[j] * dstScale) | 0; // truncate integer.
		}
	}

	attribute.setArray(dstArray);
}

export { quantize };
