import { Accessor, Animation, Document, Logger, Mesh, Node, Primitive, PrimitiveTarget, Transform, vec2, vec3 } from '@gltf-transform/core';
import { MeshQuantization } from '@gltf-transform/extensions';

const NAME = 'quantize';

type TypedArrayConstructor = Int8ArrayConstructor
	| Int16ArrayConstructor
	| Uint8ArrayConstructor
	| Uint16ArrayConstructor;
const SIGNED_INT = [Int8Array, Int16Array, Int32Array] as TypedArrayConstructor[];

export interface QuantizeOptions {
	excludeAttributes?: string[];
	quantizePosition?: number;
	quantizeNormal?: number;
	quantizeTexcoord?: number;
	quantizeColor?: number;
	quantizeWeight?: number;
	quantizeGeneric?: number;
}

export const QUANTIZE_DEFAULTS: QuantizeOptions =  {
	excludeAttributes: [],
	quantizePosition: 14,
	quantizeNormal: 10,
	quantizeTexcoord: 12,
	quantizeColor: 8,
	quantizeWeight: 8,
	quantizeGeneric: 12,
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
			// TODO(feat): Apply node transform to IBM?
			const isSkinnedMesh = mesh.listPrimitives()
				.some((prim) => prim.getAttribute('JOINTS_0'));
			if (isSkinnedMesh) {
				logger.warn(`${NAME}: Quantization for skinned mesh not yet implemented.`);
				continue;
			}

			const nodeTransform = getNodeTransform(mesh);
			transformMeshParents(doc, mesh, nodeTransform);

			for (const prim of mesh.listPrimitives()) {
				quantizePrimitive(doc, prim, nodeTransform, options);
				for (const target of prim.listTargets()) {
					quantizePrimitive(doc, target, nodeTransform, options);
				}
			}
		}

		logger.debug(`${NAME}: Complete.`);
	};

};

function quantizePrimitive(
		doc: Document,
		prim: Primitive | PrimitiveTarget,
		nodeTransform: NodeTransform,
		options: QuantizeOptions): void {
	const root = doc.getRoot();
	const logger = doc.getLogger();
	const nodeRemap = nodeTransform.nodeRemap;

	for (const semantic of prim.listSemantics()) {
		if (options.excludeAttributes.includes(semantic)) continue;

		const attribute = prim.getAttribute(semantic);
		const {bits, ctor} = getQuantizationSettings(semantic, attribute, logger, options);

		if (!ctor) continue;
		if (bits < 8 || bits > 16) throw new Error(`${NAME}: Requires bits = 8–16.`);
		if (attribute.getComponentSize() <= bits / 8) continue;

		// Avoid quantizing accessors used for multiple purposes.
		const usage = doc.getGraph().getLinks()
			.filter((link) => link.getChild() === attribute && link.getParent() !== root)
			.map((link) => link.getName());
		if (new Set(usage).size > 1) {
			logger.warn(`${NAME}: Skipping ${semantic}; attribute usage conflict.`);
			continue;
		}

		// Write quantization transform for position data into mesh parents.
		if (semantic === 'POSITION') {
			for (let i = 0, el = [], il = attribute.getCount(); i < il; i++) {
				attribute.setElement(i, nodeRemap(attribute.getElement(i, el)));
			}
		}

		// Quantize the vertex attribute.
		quantizeAttribute(attribute, ctor, bits);
		attribute.setNormalized(true);
	}

	if (prim instanceof Primitive
			&& prim.getIndices()
			&& prim.listAttributes().length
			&& prim.listAttributes()[0]!.getCount() < 65535) {
		prim.getIndices().setArray(new Uint16Array(prim.getIndices().getArray()));
	}
}

interface NodeTransform {
	nodeRemap: (v: number[]) => number[];
	nodeOffset: vec3;
	nodeScale: vec3;
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
function getNodeTransform(mesh: Mesh): NodeTransform {
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
function transformMeshParents(doc: Document, mesh: Mesh, nodeTransform: NodeTransform): void {
	const offset = nodeTransform.nodeOffset || [0, 0, 0];
	const scale = nodeTransform.nodeScale || [1, 1, 1];

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

/**
 * Quantizes an attribute to the given parameters.
 *
 * Uniformly remap 32-bit floats to reduced-precision 8- or 16-bit integers, so
 * that there are only 2^N unique values, for N within [8, 16].
 *
 * See: https://github.com/donmccurdy/glTF-Transform/issues/208
 */
function quantizeAttribute(
		attribute: Accessor,
		ctor: TypedArrayConstructor,
		bits: number
	): void {

	const dstArray = new ctor(attribute.getArray().length);

	const signBits = SIGNED_INT.includes(ctor) ? 1 : 0;
	const quantBits = bits - signBits;
	const storageBits = ctor.BYTES_PER_ELEMENT * 8 - signBits;

	const scale = Math.pow(2, quantBits) - 1;
	const lo = storageBits - quantBits;
	const hi = 2 * quantBits - storageBits;

	for (let i = 0, di = 0, el = []; i < attribute.getCount(); i++) {
		attribute.getElement(i, el);
		for (let j = 0; j < el.length; j++) {
			// Map [0.0 ... 1.0] to [0 ... scale].
			let value = Math.round(Math.abs(el[j]) * scale);

			// Replicate msb to missing lsb.
			value = (value << lo) | (value >> hi);

			// Restore sign.
			dstArray[di++] = value * Math.sign(el[j]);
		}
	}

	attribute.setArray(dstArray);
}

function getQuantizationSettings(
		semantic: string,
		attribute: Accessor,
		logger: Logger,
		options: QuantizeOptions): {bits: number; ctor?: TypedArrayConstructor} | null {

	const min = attribute.getMinNormalized([]);
	const max = attribute.getMinNormalized([]);

	let bits: number;
	let ctor: TypedArrayConstructor;

	if (semantic === 'POSITION') {
		bits = options.quantizePosition;
		ctor = bits <= 8 ? Int8Array : Int16Array;
	} else if (semantic === 'NORMAL' || semantic === 'TANGENT') {
		bits = options.quantizeNormal;
		ctor = bits <= 8 ? Int8Array : Int16Array;
	} else if (semantic.startsWith('COLOR_')) {
		bits = options.quantizeColor;
		ctor = bits <= 8 ? Uint8Array : Uint16Array;
	} else if (semantic.startsWith('TEXCOORD_')) {
		if (min.some(v => v < 0) || max.some(v => v > 1)) {
			logger.warn(`${NAME}: Skipping ${semantic}; out of supported range.`);
			return {bits: -1};
		}
		bits = options.quantizeTexcoord;
		ctor = bits <= 8 ? Uint8Array : Uint16Array;
	} else if (semantic.startsWith('JOINTS_')) {
		bits = Math.max(...attribute.getMax([])) <= 255 ? 8 : 16;
		ctor = bits <= 8 ? Uint8Array : Uint16Array;
		if (attribute.getComponentSize() > bits / 8) {
			attribute.setArray(new ctor(attribute.getArray()));
		}
		return {bits: -1};
	} else if (semantic.startsWith('WEIGHTS_')) {
		if (min.some(v => v < 0) || max.some(v => v > 1)) {
			logger.warn(`${NAME}: Skipping ${semantic}; out of supported range.`);
			return {bits: -1};
		}
		bits = options.quantizeWeight;
		ctor = bits <= 8 ? Uint8Array : Uint16Array;
	} else if (semantic.startsWith('_')) {
		if (min.some(v => v < -1) || max.some(v => v > 1)) {
			logger.warn(`${NAME}: Skipping ${semantic}; out of supported range.`);
			return {bits: -1};
		}
		bits = options.quantizeGeneric;
		ctor = min.some(v => v < 0)
			? (ctor = bits <= 8 ? Int8Array : Int16Array)
			: (ctor = bits <= 8 ? Uint8Array : Uint16Array);
	}

	return {bits, ctor};
}

export { quantize };
