import { Accessor, Animation, Document, Logger, Mesh, Node, Primitive, PrimitiveTarget, Transform, bounds, vec3, mat4, Skin, bbox, PropertyType } from '@gltf-transform/core';
import { MeshQuantization } from '@gltf-transform/extensions';
import { scale, translate } from 'gl-matrix/mat4';
import { prune } from './prune';

const NAME = 'quantize';

type TypedArrayConstructor = Int8ArrayConstructor
	| Int16ArrayConstructor
	| Uint8ArrayConstructor
	| Uint16ArrayConstructor;
const SIGNED_INT = [Int8Array, Int16Array, Int32Array] as TypedArrayConstructor[];


/** Options for the {@link quantize} function. */
export interface QuantizeOptions {
	excludeAttributes?: string[];
	/** Bounds for quantization grid. */
	quantizationVolume?: 'mesh' | 'scene';
	/** Quantization bits for `POSITION` attributes. */
	quantizePosition?: number;
	/** Quantization bits for `NORMAL` attributes. */
	quantizeNormal?: number;
	/** Quantization bits for `TEXCOORD_*` attributes. */
	quantizeTexcoord?: number;
	/** Quantization bits for `COLOR_*` attributes. */
	quantizeColor?: number;
	/** Quantization bits for `WEIGHT_*` attributes. */
	quantizeWeight?: number;
	/** Quantization bits for application-specific (`_*`) attributes. */
	quantizeGeneric?: number;
}

export const QUANTIZE_DEFAULTS: Required<QuantizeOptions> =  {
	excludeAttributes: [],
	quantizationVolume: 'mesh',
	quantizePosition: 14,
	quantizeNormal: 10,
	quantizeTexcoord: 12,
	quantizeColor: 8,
	quantizeWeight: 8,
	quantizeGeneric: 12,
};

/**
 * References:
 * - https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_mesh_quantization
 * - http://www.aclockworkberry.com/normal-unpacking-quantization-errors/
 * - https://www.mathworks.com/help/dsp/ref/uniformencoder.html
 * - https://oroboro.com/compressed-unit-vectors/
 */

/**
 * Quantizes vertex attributes with `KHR_mesh_quantization`, reducing the size and memory footprint
 * of the file.
 */
const quantize = (_options: QuantizeOptions = QUANTIZE_DEFAULTS): Transform => {

	const options = {...QUANTIZE_DEFAULTS, ..._options} as Required<QuantizeOptions>;

	return async (doc: Document): Promise<void> => {
		const logger = doc.getLogger();
		const root = doc.getRoot();

		doc.createExtension(MeshQuantization).setRequired(true);

		let quantizationVolume: bbox | undefined = undefined;
		if (options.quantizationVolume === 'scene') {
			if (root.listScenes().length !== 1) {
				logger.warn(`[${NAME}]: quantizationVolume=scene requires exactly 1 scene.`);
			} else {
				quantizationVolume = bounds(root.listScenes().pop()!);
			}
		}

		for (const mesh of doc.getRoot().listMeshes()) {
			const nodeTransform = getNodeTransform(mesh, quantizationVolume);
			if (nodeTransform && !options.excludeAttributes.includes('POSITION')) {
				transformMeshParents(doc, mesh, nodeTransform);
			}

			for (const prim of mesh.listPrimitives()) {
				quantizePrimitive(doc, prim, nodeTransform, options);
				for (const target of prim.listTargets()) {
					quantizePrimitive(doc, target, nodeTransform, options);
				}
			}
		}

		await doc.transform(prune({propertyTypes: [PropertyType.ACCESSOR, PropertyType.SKIN]}));

		logger.debug(`${NAME}: Complete.`);
	};

};

function quantizePrimitive(
		doc: Document,
		prim: Primitive | PrimitiveTarget,
		nodeTransform: NodeTransform | null,
		options: Required<QuantizeOptions>): void {
	const root = doc.getRoot();
	const logger = doc.getLogger();
	const nodeRemap = nodeTransform ? nodeTransform.nodeRemap : null;

	for (const semantic of prim.listSemantics()) {
		if (options.excludeAttributes.includes(semantic)) continue;

		const attribute = prim.getAttribute(semantic)!;
		const {bits, ctor} = getQuantizationSettings(semantic, attribute, logger, options);

		if (!ctor) continue;
		if (bits < 8 || bits > 16) throw new Error(`${NAME}: Requires bits = 8–16.`);
		if (attribute.getComponentSize() <= bits / 8) continue;

		// Avoid quantizing accessors used for multiple purposes.
		const usage = doc.getGraph().listParentLinks(attribute)
			.filter((link) => link.getParent() !== root)
			.map((link) => link.getName());
		if (new Set(usage).size > 1) {
			logger.warn(`${NAME}: Skipping ${semantic}; attribute usage conflict.`);
			continue;
		}

		// Remap position data.
		if (semantic === 'POSITION') {
			if (!nodeRemap) {
				throw new Error(`${NAME}: Failed precondition; missing node transform.`);
			}
			for (let i = 0, el: vec3 = [0, 0, 0], il = attribute.getCount(); i < il; i++) {
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
		const indices = prim.getIndices()!;
		indices.setArray(new Uint16Array(indices.getArray()!));
	}
}

interface NodeTransform {
	nodeRemap: (v: number[]) => number[];
	nodeOffset: vec3;
	nodeScale: number;
}

/** Computes total min and max of all (vec3) Accessors in a list. */
function flatBounds(accessors: Accessor[]): bbox {
	const min = [Infinity, Infinity, Infinity] as vec3;
	const max = [-Infinity, -Infinity, -Infinity] as vec3;

	const tmpMin: number[] = [];
	const tmpMax: number[] = [];

	for (const accessor of accessors) {
		accessor.getMinNormalized(tmpMin);
		accessor.getMaxNormalized(tmpMax);
		for (let i = 0; i < 3; i++) {
			min[i] = Math.min(min[i], tmpMin[i]);
			max[i] = Math.max(max[i], tmpMax[i]);
		}
	}

	return {min, max};
}

/** Computes node quantization transforms in local space. */
function getNodeTransform(mesh: Mesh, volume?: bbox): NodeTransform | null {
	const positions = mesh.listPrimitives()
		.map((prim) => prim.getAttribute('POSITION')!);
	if (!positions.some((p) => !!p)) return null;

	const {min, max} = volume || flatBounds(positions);

	// Uniform scale (https://github.com/donmccurdy/glTF-Transform/issues/328).
	const nodeScale = Math.max(
		(max[0] - min[0]) / 2,
		(max[1] - min[1]) / 2,
		(max[2] - min[2]) / 2,
	);
	const nodeOffset: vec3 = [
		min[0] + nodeScale,
		min[1] + nodeScale,
		min[2] + nodeScale
	];
	const nodeRemap = (v: number[]) => [
		-1 + (v[0] - min[0]) / nodeScale,
		-1 + (v[1] - min[1]) / nodeScale,
		-1 + (v[2] - min[2]) / nodeScale,
	];
	return {nodeRemap, nodeOffset, nodeScale};
}

/** Applies corrective scale and offset to nodes referencing a quantized Mesh. */
function transformMeshParents(doc: Document, mesh: Mesh, nodeTransform: NodeTransform): void {
	const offset = nodeTransform.nodeOffset || [0, 0, 0];
	const scale = nodeTransform.nodeScale || 1;

	for (const parent of mesh.listParents()) {
		if (parent instanceof Node) {
			const isParentNode = parent.listChildren().length > 0;
			const isAnimated = !!parent.listParents().find((p) => p instanceof Animation);

			if (parent.getSkin()) {
				parent.setSkin(transformSkin(parent.getSkin()!, nodeTransform));
				continue;
			}

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
				.setScale([s[0] * scale, s[1] * scale, s[2] * scale]);
		}
	}
}

/** Applies corrective scale and offset to skin IBMs. */
function transformSkin(skin: Skin, nodeTransform: NodeTransform): Skin {
	skin = skin.clone();
	const nodeScale = [
		nodeTransform.nodeScale,
		nodeTransform.nodeScale,
		nodeTransform.nodeScale
	] as vec3;
	const inverseBindMatrices = skin.getInverseBindMatrices()!.clone();
	const ibm = [] as unknown as mat4;
	for (let i = 0, count = inverseBindMatrices.getCount(); i < count; i++) {
		inverseBindMatrices.getElement(i, ibm);
		translate(ibm, ibm, nodeTransform.nodeOffset);
		scale(ibm, ibm, nodeScale);
		inverseBindMatrices.setElement(i, ibm);
	}
	return skin.setInverseBindMatrices(inverseBindMatrices);
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

	const dstArray = new ctor(attribute.getArray()!.length);

	const signBits = SIGNED_INT.includes(ctor) ? 1 : 0;
	const quantBits = bits - signBits;
	const storageBits = ctor.BYTES_PER_ELEMENT * 8 - signBits;

	const scale = Math.pow(2, quantBits) - 1;
	const lo = storageBits - quantBits;
	const hi = 2 * quantBits - storageBits;

	for (let i = 0, di = 0, el: number[] = []; i < attribute.getCount(); i++) {
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
		options: Required<QuantizeOptions>): {bits: number; ctor?: TypedArrayConstructor} {

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
			attribute.setArray(new ctor(attribute.getArray()!));
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
	} else {
		throw new Error(`${NAME}: Unexpected semantic, "${semantic}".`);
	}

	return {bits, ctor};
}

export { quantize };
