import { Document, Primitive, type Transform } from '@gltf-transform/core';
import type { MeshoptSimplifier } from 'meshoptimizer';
import { compactAttribute, compactPrimitive } from './compact-primitive.js';
import { convertPrimitiveToTriangles } from './convert-primitive-mode.js';
import { dequantizeAttributeArray } from './dequantize.js';
import { getPrimitiveVertexCount, VertexCountMethod } from './get-vertex-count.js';
import { unweldPrimitive } from './unweld.js';
import {
	assignDefaults,
	createTransform,
	deepDisposePrimitive,
	deepListAttributes,
	deepSwapAttribute,
	formatDeltaOp,
	shallowCloneAccessor,
} from './utils.js';
import { weld } from './weld.js';

const NAME = 'simplify';

const { POINTS, LINES, LINE_STRIP, LINE_LOOP, TRIANGLES, TRIANGLE_STRIP, TRIANGLE_FAN } = Primitive.Mode;

/** Options for the {@link simplify} function. */
export interface SimplifyOptions {
	/** MeshoptSimplifier instance. */
	simplifier: unknown;
	/** Target ratio (0–1) of vertices to keep. Default: 0.0 (0%). */
	ratio?: number;
	/** Limit on error, as a fraction of mesh radius. Default: 0.0001 (0.01%). */
	error?: number;
	/**
	 * Whether to lock topological borders of the mesh. May be necessary when
	 * adjacent 'chunks' of a large mesh (e.g. terrain) share a border, helping
	 * to ensure no seams appear.
	 */
	lockBorder?: boolean;

	regularize?: boolean;

	normalWeight?: number;
	colorWeight?: number;
	textureWeight?: number;
}

export const SIMPLIFY_DEFAULTS: Required<Omit<SimplifyOptions, 'simplifier'>> = {
	ratio: 0.0,
	error: 0.0001,
	lockBorder: false,
	regularize: false,
	normalWeight: 0.01,
	colorWeight: 0.01,
	textureWeight: 0.1,
};

/**
 * Simplification algorithm, based on meshoptimizer, producing meshes with fewer
 * triangles and vertices. Simplification is lossy, but the algorithm aims to
 * preserve visual quality as much as possible for given parameters.
 *
 * The algorithm aims to reach the target 'ratio', while minimizing error. If
 * error exceeds the specified 'error' threshold, the algorithm will quit
 * before reaching the target ratio. Examples:
 *
 * - ratio=0.0, error=0.0001: Aims for maximum simplification, constrained to 0.01% error.
 * - ratio=0.5, error=0.0001: Aims for 50% simplification, constrained to 0.01% error.
 * - ratio=0.5, error=1: Aims for 50% simplification, unconstrained by error.
 *
 * Topology, particularly split vertices, will also limit the simplifier. For
 * best results, apply a {@link weld} operation before simplification.
 *
 * Example:
 *
 * ```javascript
 * import { simplify, weld } from '@gltf-transform/functions';
 * import { MeshoptSimplifier } from 'meshoptimizer';
 *
 * await document.transform(
 *   weld({}),
 *   simplify({ simplifier: MeshoptSimplifier, ratio: 0.75, error: 0.001 })
 * );
 * ```
 *
 * References:
 * - https://github.com/zeux/meshoptimizer/blob/master/js/README.md#simplifier
 *
 * @category Transforms
 */
export function simplify(_options: SimplifyOptions): Transform {
	const options = assignDefaults(SIMPLIFY_DEFAULTS, _options);

	const simplifier = options.simplifier as typeof MeshoptSimplifier | undefined;

	if (!simplifier) {
		throw new Error(`${NAME}: simplifier dependency required — install "meshoptimizer".`);
	}

	return createTransform(NAME, async (document: Document): Promise<void> => {
		const logger = document.getLogger();

		await simplifier.ready;
		await document.transform(weld({ overwrite: false }));

		let numUnsupported = 0;

		// Simplify mesh primitives.
		for (const mesh of document.getRoot().listMeshes()) {
			for (const prim of mesh.listPrimitives()) {
				const mode = prim.getMode();
				if (mode !== TRIANGLES && mode !== TRIANGLE_STRIP && mode !== TRIANGLE_FAN && mode !== POINTS) {
					numUnsupported++;
					continue;
				}

				simplifyPrimitive(prim, options);

				if (getPrimitiveVertexCount(prim, VertexCountMethod.RENDER) === 0) {
					deepDisposePrimitive(prim);
				}
			}

			if (mesh.listPrimitives().length === 0) mesh.dispose();
		}

		if (numUnsupported > 0) {
			logger.warn(`${NAME}: Skipped ${numUnsupported} primitives: Unsupported draw mode.`);
		}

		logger.debug(`${NAME}: Complete.`);
	});
}

/** @hidden */
export function simplifyPrimitive(prim: Primitive, _options: SimplifyOptions): Primitive {
	const options = { ...SIMPLIFY_DEFAULTS, ..._options } as Required<SimplifyOptions>;
	const simplifier = options.simplifier as typeof MeshoptSimplifier;
	const graph = prim.getGraph();
	const document = Document.fromGraph(graph)!;
	const logger = document.getLogger();

	switch (prim.getMode()) {
		case POINTS:
			return _simplifyPoints(document, prim, options);
		case LINES:
		case LINE_STRIP:
		case LINE_LOOP:
			logger.warn(`${NAME}: Skipping primitive simplification: Unsupported draw mode.`);
			return prim;
		case TRIANGLE_STRIP:
		case TRIANGLE_FAN:
			convertPrimitiveToTriangles(prim);
			break;
	}

	// (1) If primitive draws <50% of its vertex stream, compact before simplification.

	const srcVertexCount = getPrimitiveVertexCount(prim, VertexCountMethod.UPLOAD);
	const srcIndexCount = getPrimitiveVertexCount(prim, VertexCountMethod.RENDER);
	if (srcIndexCount < srcVertexCount / 2) {
		compactPrimitive(prim);
	}

	const position = prim.getAttribute('POSITION')!;
	const srcIndices = prim.getIndices()!;

	let positionArray = position.getArray()!;
	let indicesArray = srcIndices.getArray()!;

	// (2) Gather attributes and indices in Meshopt-compatible format.

	if (!(positionArray instanceof Float32Array)) {
		positionArray = dequantizeAttributeArray(positionArray, position.getComponentType(), position.getNormalized());
	}
	if (!(indicesArray instanceof Uint32Array)) {
		indicesArray = new Uint32Array(indicesArray);
	}

	// (3) Run simplification.

	const targetCount = Math.floor((options.ratio * srcIndexCount) / 3) * 3;
	const flags = options.lockBorder ? ['LockBorder'] : [];

	const [dstIndicesArray, error] = simplifier.simplify(
		indicesArray,
		positionArray,
		3,
		targetCount,
		options.error,
		flags as 'LockBorder'[],
	);

	// (4) Assign subset of indexes; compact primitive.

	prim.setIndices(shallowCloneAccessor(document, srcIndices).setArray(dstIndicesArray));
	if (srcIndices.listParents().length === 1) srcIndices.dispose();
	compactPrimitive(prim);

	const dstVertexCount = getPrimitiveVertexCount(prim, VertexCountMethod.UPLOAD);
	if (dstVertexCount <= 65534) {
		prim.getIndices()!.setArray(new Uint16Array(prim.getIndices()!.getArray()!));
	}

	logger.debug(`${NAME}: ${formatDeltaOp(srcVertexCount, dstVertexCount)} vertices, error: ${error.toFixed(4)}.`);

	return prim;
}



/** @hidden */
export function simplifyPrimitiveWithAttributes(prim: Primitive, _options: SimplifyOptions): Primitive {
	const options = { ...SIMPLIFY_DEFAULTS, ..._options } as Required<SimplifyOptions>;
	const simplifier = options.simplifier as typeof MeshoptSimplifier & { simplifyWithUpdate: typeof MeshoptSimplifier.simplifyWithAttributes };
	const graph = prim.getGraph();
	const document = Document.fromGraph(graph)!;
	const logger = document.getLogger();

	switch (prim.getMode()) {
		case POINTS:
			return _simplifyPoints(document, prim, options);
		case LINES:
		case LINE_STRIP:
		case LINE_LOOP:
			logger.warn(`${NAME}: Skipping primitive simplification: Unsupported draw mode.`);
			return prim;
		case TRIANGLE_STRIP:
		case TRIANGLE_FAN:
			convertPrimitiveToTriangles(prim);
			break;
	}

	// (1) If primitive draws <50% of its vertex stream, compact before simplification.

	const srcVertexCount = getPrimitiveVertexCount(prim, VertexCountMethod.UPLOAD);
	const srcIndexCount = getPrimitiveVertexCount(prim, VertexCountMethod.RENDER);
	if (srcIndexCount < srcVertexCount / 2) {
		compactPrimitive(prim);
	}

	const position = prim.getAttribute('POSITION')!;
	const srcIndices = prim.getIndices()!;

	let positionArray = position.getArray()!;
	let indicesArray = srcIndices.getArray()!;

	// (2) Gather attributes and indices in Meshopt-compatible format.

	if (!(positionArray instanceof Float32Array)) {
		positionArray = dequantizeAttributeArray(positionArray, position.getComponentType(), position.getNormalized());
	}
	if (!(indicesArray instanceof Uint32Array)) {
		indicesArray = new Uint32Array(indicesArray);
	}

	// (2.5) Gather attributes for withAttributes meshopt simplifier
	const normalAttributes = prim.getAttribute('NORMAL_0')?.getArray();
	const colorAttributes = prim.getAttribute('COLOR_0')?.getArray();
	const uvAttributes = prim.getAttribute('TEXCOORD_0')?.getArray();

	// Assume we have color, normal, and uv attributes. TODO: test if we can remove some of these.
	let attributes = 8; // 3 color, 3 normal, 2 uv
	const attributesArray = new Float32Array(positionArray.length / 3 * attributes);

	const attrib_weights = [
		options.normalWeight,
		options.normalWeight,
		options.normalWeight,
		options.colorWeight,
		options.colorWeight,
		options.colorWeight,
		options.textureWeight,
		options.textureWeight,
	];

	for (let i = 0; i < positionArray.length; i += 3) {
		if (normalAttributes) {
			attributesArray[i * attributes + 0] = normalAttributes[i * 3 + 0];
			attributesArray[i * attributes + 1] = normalAttributes[i * 3 + 1];
			attributesArray[i * attributes + 2] = normalAttributes[i * 3 + 2];
		}
		if (colorAttributes) {
			attributesArray[i * attributes + 3] = colorAttributes[i * 3 + 0];
			attributesArray[i * attributes + 4] = colorAttributes[i * 3 + 1];
			attributesArray[i * attributes + 5] = colorAttributes[i * 3 + 2];
		}
		if (uvAttributes) {
			attributesArray[i * attributes + 6] = uvAttributes[i * 2 + 0];
			attributesArray[i * attributes + 7] = uvAttributes[i * 2 + 1];
		}
	}


	// (3) Run simplification.

	const targetCount = Math.floor((options.ratio * srcIndexCount) / 3) * 3;
	const flags = new Array<string>();
	if (options.lockBorder) {
		flags.push('LockBorder');
	}
	if (options.regularize) {
		flags.push('Regularize');
	}


	/*

			indices,
			vertex_positions,
			vertex_positions_stride,
			vertex_attributes,
			vertex_attributes_stride,
			attribute_weights,
			vertex_lock,
			target_index_count,
			target_error,
			flags
	*/
	console.log(positionArray.length / 3, attributes, attributesArray.length, positionArray.length / 3 * attributes)

	// size_t meshopt_simplifyWithUpdate(unsigned int* indices, size_t index_count, float* vertex_positions_data, size_t vertex_count, size_t vertex_positions_stride, float* vertex_attributes_data, size_t vertex_attributes_stride, const float* attribute_weights, size_t attribute_count, const unsigned char* vertex_lock, size_t target_index_count, float target_error, unsigned int options, float* out_result_error)

	// size_t meshopt_simplifyWithAttributes(unsigned int* destination, const unsigned int* indices, size_t index_count, const float* vertex_positions_data, size_t vertex_count, size_t vertex_positions_stride, const float* vertex_attributes_data, size_t vertex_attributes_stride, const float* attribute_weights, size_t attribute_count, const unsigned char* vertex_lock, size_t target_index_count, float target_error, unsigned int options, float* out_result_error)


	// const [dstIndicesArray, error] = simplifier.simplifyWithUpdate(
	const [dstIndicesArray, error] = simplifier.simplifyWithAttributes(
		indicesArray,
		positionArray,
		3,
		attributesArray,
		attributes,
		attrib_weights,
		null,
		targetCount,
		options.error,
		flags as 'LockBorder'[],
	);

	// (4) Assign subset of indexes; compact primitive.

	prim.setIndices(shallowCloneAccessor(document, srcIndices).setArray(dstIndicesArray));
	if (srcIndices.listParents().length === 1) srcIndices.dispose();
	compactPrimitive(prim);

	const dstVertexCount = getPrimitiveVertexCount(prim, VertexCountMethod.UPLOAD);
	if (dstVertexCount <= 65534) {
		prim.getIndices()!.setArray(new Uint16Array(prim.getIndices()!.getArray()!));
	}

	logger.debug(`${NAME}: ${formatDeltaOp(srcVertexCount, dstVertexCount)} vertices, error: ${error.toFixed(4)}.`);

	return prim;
}


function _simplifyPoints(document: Document, prim: Primitive, options: Required<SimplifyOptions>): Primitive {
	const simplifier = options.simplifier as typeof MeshoptSimplifier;
	const logger = document.getLogger();

	const indices = prim.getIndices();
	if (indices) unweldPrimitive(prim);

	const position = prim.getAttribute('POSITION')!;
	const color = prim.getAttribute('COLOR_0');
	const srcVertexCount = position.getCount();

	let positionArray = position.getArray()!;
	let colorArray = color ? color.getArray()! : undefined;
	const colorStride = color ? color.getComponentSize() : undefined;

	// (1) Gather attributes in Meshopt-compatible format.

	if (!(positionArray instanceof Float32Array)) {
		positionArray = dequantizeAttributeArray(positionArray, position.getComponentType(), position.getNormalized());
	}
	if (colorArray && !(colorArray instanceof Float32Array)) {
		colorArray = dequantizeAttributeArray(colorArray, position.getComponentType(), position.getNormalized());
	}

	// (2) Run simplification.

	const targetCount = Math.floor(options.ratio * srcVertexCount);
	const dstIndicesArray = simplifier.simplifyPoints(positionArray, 3, targetCount, colorArray, colorStride);

	// (3) Write vertex attributes.

	const [remap, unique] = simplifier.compactMesh(dstIndicesArray);

	logger.debug(`${NAME}: ${formatDeltaOp(position.getCount(), unique)} vertices.`);

	for (const srcAttribute of deepListAttributes(prim)) {
		const dstAttribute = shallowCloneAccessor(document, srcAttribute);
		compactAttribute(srcAttribute, null, remap, dstAttribute, unique);
		deepSwapAttribute(prim, srcAttribute, dstAttribute);
		if (srcAttribute.listParents().length === 1) srcAttribute.dispose();
	}

	return prim;
}
