import { Accessor, Animation, Document, Logger, Mesh, Node, Primitive, PrimitiveTarget, Transform, bounds, vec3, mat4, Skin, bbox, PropertyType, vec2, vec4 } from '@gltf-transform/core';
import { MeshQuantization } from '@gltf-transform/extensions';
import { fromRotationTranslationScale, multiply as multiplyMat4 } from 'gl-matrix/mat4';
import { dedup } from './dedup';
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

		// If quantization volume is unified, compute it.
		let quantizationVolume: bbox | undefined = undefined;
		if (options.quantizationVolume === 'scene') {
			if (root.listScenes().length !== 1) {
				logger.warn(`[${NAME}]: quantizationVolume=scene requires exactly 1 scene.`);
			} else {
				quantizationVolume = bounds(root.listScenes().pop()!);
			}
		}

		// Always use unified UV quantization grid.
		// const uvTransform = getUVTransform(doc);

		// Quantize mesh primitives.
		for (const mesh of doc.getRoot().listMeshes()) {
			const nodeTransform = getNodeTransform(mesh, quantizationVolume);
			if (nodeTransform && !options.excludeAttributes.includes('POSITION')) {
				transformMeshParents(doc, mesh, nodeTransform);
			}

			for (const prim of mesh.listPrimitives()) {
				quantizePrimitive(doc, prim, nodeTransform, /*uvTransform,*/ options);
				for (const target of prim.listTargets()) {
					quantizePrimitive(doc, target, nodeTransform, /*uvTransform,*/ options);
				}
			}
		}

		// Apply quantization transforms as TextureInfo transforms.
		// const textureInfos = doc.getGraph().getLinks()
		// 	.map((link) => link.getChild())
		// 	.filter((child) => child instanceof TextureInfo) as TextureInfo[];
		// for (const textureInfo of Array.from(new Set(textureInfos))) {
		// 	const texCoord = textureInfo.getTexCoord();
		// 	if (!options.excludeAttributes.includes(`TEXCOORD_${texCoord}`)) {
		// 		// TODO(feat): Obtain existing transform, if any. Multiply mat3 results, and set.
		// 	}
		// }

		await doc.transform(
			prune({propertyTypes: [PropertyType.ACCESSOR, PropertyType.SKIN]}),
			dedup({propertyTypes: [PropertyType.ACCESSOR]}),
		);

		logger.debug(`${NAME}: Complete.`);
	};

};

function quantizePrimitive(
		doc: Document,
		prim: Primitive | PrimitiveTarget,
		nodeTransform: VectorTransform<vec3>,
		// uvTransform: VectorTransform<vec2> | null,
		options: Required<QuantizeOptions>): void {
	const logger = doc.getLogger();

	for (const semantic of prim.listSemantics()) {
		if (options.excludeAttributes.includes(semantic)) continue;

		const srcAttribute = prim.getAttribute(semantic)!;
		const {bits, ctor} = getQuantizationSettings(semantic, srcAttribute, logger, options);

		if (!ctor) continue;
		if (bits < 8 || bits > 16) throw new Error(`${NAME}: Requires bits = 8–16.`);
		if (srcAttribute.getComponentSize() <= bits / 8) continue;

		const dstAttribute = srcAttribute.clone();

		// Remap position data.
		if (semantic === 'POSITION') {
			for (let i = 0, el: vec3 = [0, 0, 0], il = dstAttribute.getCount(); i < il; i++) {
				dstAttribute.setElement(i, nodeTransform.remap(dstAttribute.getElement(i, el)));
			}
		}

		// Remap UV data.
		// if (semantic.startsWith('TEXCOORD_')) {
		// 	for (let i = 0, el: vec2 = [0, 0], il = dstAttribute.getCount(); i < il; i++) {
		// 		dstAttribute.setElement(i, uvTransform!.remap(dstAttribute.getElement(i, el)));
		// 	}
		// }

		// Quantize the vertex attribute.
		quantizeAttribute(dstAttribute, ctor, bits);
		prim.swap(srcAttribute, dstAttribute);
	}

	if (prim instanceof Primitive
			&& prim.getIndices()
			&& prim.listAttributes().length
			&& prim.listAttributes()[0]!.getCount() < 65535) {
		const indices = prim.getIndices()!;
		indices.setArray(new Uint16Array(indices.getArray()!));
	}
}

interface VectorTransform<T = vec2|vec3|vec4> {
	remap: (v: number[]) => number[];
	offset: T;
	scale: number;
}

/** Computes total min and max of all Accessors in a list. */
function flatBounds<T = vec2|vec3>(accessors: Accessor[], elementSize: number): ({min: T, max: T}) {
	const min: number[] = new Array(elementSize).fill(Infinity);
	const max: number[] = new Array(elementSize).fill(-Infinity);

	const tmpMin: number[] = [];
	const tmpMax: number[] = [];

	for (const accessor of accessors) {
		accessor.getMinNormalized(tmpMin);
		accessor.getMaxNormalized(tmpMax);
		for (let i = 0; i < elementSize; i++) {
			min[i] = Math.min(min[i], tmpMin[i]);
			max[i] = Math.max(max[i], tmpMax[i]);
		}
	}

	return {min, max} as unknown as {min: T, max: T};
}

/** Computes node quantization transforms in local space. */
function getNodeTransform(mesh: Mesh, volume?: bbox): VectorTransform<vec3> {
	const {min, max} = volume || flatBounds(listPositionAttributes(mesh), 3);

	// Scaling factor transforms [-1,1] box to the mesh AABB in local space.
	// See: https://github.com/donmccurdy/glTF-Transform/issues/328
	const scale = Math.max(
		(max[0] - min[0]) / 2, // Divide because interval [-1,1] has length 2.
		(max[1] - min[1]) / 2,
		(max[2] - min[2]) / 2,
	);

	// Original center of the mesh, in local space.
	const offset: vec3 = [
		min[0] + (max[0] - min[0]) / 2,
		min[1] + (max[1] - min[1]) / 2,
		min[2] + (max[2] - min[2]) / 2,
	];

	// Transforms mesh vertices to a [-1,1] AABB centered at the origin.
	const remap = (v: number[]) => [
		(v[0] - offset[0]) / scale,
		(v[1] - offset[1]) / scale,
		(v[2] - offset[2]) / scale,
	];

	return {remap, offset, scale};
}

/** Computes UV quantization transform. */
// function getUVTransform(document: Document): VectorTransform<vec2> | null {
// 	const uvs = listUVAttributes(document);
// 	if (uvs.length === 0) return null;

// 	const {min, max} = flatBounds(uvs, 2);

// 	// Scaling factor transforms [0,1] box to original AABB.
// 	const scale = Math.max(
// 		max[0] - min[0],
// 		max[1] - min[1],
// 	);

// 	// Original center of UVs.
// 	const offset: vec2 = [
// 		min[0] + (max[0] - min[0]) / 2,
// 		min[1] + (max[1] - min[1]) / 2,
// 	];

// 	// Transforms UVs to a [0,1] AABB.
// 	const remap = (v: number[]) => [
// 		(v[0] - offset[0]) / scale,
// 		(v[1] - offset[1]) / scale,
// 	];

// 	return {remap, scale, offset};
// }

function listPositionAttributes(mesh: Mesh): Accessor[] {
	const positions: Accessor[] = [];
	for (const prim of mesh.listPrimitives()) {
		const attribute = prim.getAttribute('POSITION');
		if (attribute) positions.push(attribute);
		for (const target of prim.listTargets()) {
			const attribute = target.getAttribute('POSITION');
			if (attribute) positions.push(attribute);
		}
	}
	if (positions.length === 0) {
		throw new Error(`${NAME}: Missing "POSITION" attribute.`);
	}
	return positions;
}

// function listUVAttributes(document: Document): Accessor[] {
// 	const uvs: Accessor[] = [];
// 	for (const mesh of document.getRoot().listMeshes()) {
// 		for (const prim of mesh.listPrimitives()) {
// 			let uv: Accessor | null, i = 0;
// 			while ((uv = prim.getAttribute(`TEXCOORD_${i++}`))) {
// 				uvs.push(uv);
// 			}
// 		}
// 	}
// 	return uvs;
// }

/** Applies corrective scale and offset to nodes referencing a quantized Mesh. */
function transformMeshParents(
	doc: Document,
	mesh: Mesh,
	nodeTransform: VectorTransform<vec3>
): void {
	const transformMatrix = fromTransform(nodeTransform);
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

			const nodeMatrix = targetNode.getMatrix();
			const localMatrix = multiplyMat4([] as unknown as mat4, nodeMatrix, transformMatrix);
			targetNode.setMatrix(localMatrix as mat4);
		}
	}
}

/** Applies corrective scale and offset to skin IBMs. */
function transformSkin(skin: Skin, nodeTransform: VectorTransform<vec3>): Skin {
	skin = skin.clone();
	const transformMatrix = fromTransform(nodeTransform);
	const inverseBindMatrices = skin.getInverseBindMatrices()!.clone();
	const ibm = [] as unknown as mat4;
	for (let i = 0, count = inverseBindMatrices.getCount(); i < count; i++) {
		inverseBindMatrices.getElement(i, ibm);
		multiplyMat4(ibm, ibm, transformMatrix);
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

	attribute.setArray(dstArray).setNormalized(true);
}

function getQuantizationSettings(
		semantic: string,
		attribute: Accessor,
		logger: Logger,
		options: Required<QuantizeOptions>): {bits: number; ctor?: TypedArrayConstructor} {

	const min = attribute.getMinNormalized([]);
	const max = attribute.getMaxNormalized([]);

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
		// TODO(feat): Implement...
		if (min.some(v => v < 0) || max.some(v => v > 1)) {
			logger.warn(`${NAME}: Skipping ${semantic}; out of [0,1] range.`);
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
			logger.warn(`${NAME}: Skipping ${semantic}; out of [0,1] range.`);
			return {bits: -1};
		}
		bits = options.quantizeWeight;
		ctor = bits <= 8 ? Uint8Array : Uint16Array;
	} else if (semantic.startsWith('_')) {
		if (min.some(v => v < -1) || max.some(v => v > 1)) {
			logger.warn(`${NAME}: Skipping ${semantic}; out of [-1,1] range.`);
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

function fromTransform(transform: VectorTransform<vec3>): mat4 {
	return fromRotationTranslationScale(
		[] as unknown as mat4,
		[0, 0, 0, 1],
		transform.offset,
		[transform.scale, transform.scale, transform.scale],
	) as mat4;
}

export { quantize };
