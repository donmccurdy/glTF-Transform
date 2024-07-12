import { Document, Primitive, PropertyType, Transform } from '@gltf-transform/core';
import {
	createTransform,
	formatDeltaOp,
	deepListAttributes,
	deepSwapAttribute,
	shallowCloneAccessor,
	assignDefaults,
} from './utils.js';
import { weld } from './weld.js';
import type { MeshoptSimplifier } from 'meshoptimizer';
import { dedup } from './dedup.js';
import { prune } from './prune.js';
import { dequantizeAttributeArray } from './dequantize.js';
import { unweldPrimitive } from './unweld.js';
import { convertPrimitiveToTriangles } from './convert-primitive-mode.js';
import { compactAttribute, compactPrimitive } from './compact-primitive.js';
import { VertexCountMethod, getPrimitiveVertexCount } from './get-vertex-count.js';

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
	/**
	 * Whether to perform cleanup steps after completing the operation. Recommended, and enabled by
	 * default. Cleanup removes temporary resources created during the operation, but may also remove
	 * pre-existing unused or duplicate resources in the {@link Document}. Applications that require
	 * keeping these resources may need to disable cleanup, instead calling {@link dedup} and
	 * {@link prune} manually (with customized options) later in the processing pipeline.
	 * @experimental
	 */
	cleanup?: boolean;
}

export const SIMPLIFY_DEFAULTS: Required<Omit<SimplifyOptions, 'simplifier'>> = {
	ratio: 0.0,
	error: 0.0001,
	lockBorder: false,
	cleanup: true,
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
		await document.transform(weld({ overwrite: false, cleanup: options.cleanup }));

		let numUnsupported = 0;

		// Simplify mesh primitives.
		for (const mesh of document.getRoot().listMeshes()) {
			for (const prim of mesh.listPrimitives()) {
				const mode = prim.getMode();
				if (mode === TRIANGLES || mode === TRIANGLE_STRIP || mode === TRIANGLE_FAN) {
					simplifyPrimitive(prim, options);
					if (getPrimitiveVertexCount(prim, VertexCountMethod.RENDER) === 0) {
						prim.dispose();
					}
				} else if (prim.getMode() === POINTS && !!simplifier.simplifyPoints) {
					simplifyPrimitive(prim, options);
					if (getPrimitiveVertexCount(prim, VertexCountMethod.RENDER) === 0) {
						prim.dispose();
					}
				} else {
					numUnsupported++;
				}
			}

			if (mesh.listPrimitives().length === 0) mesh.dispose();
		}

		if (numUnsupported > 0) {
			logger.warn(`${NAME}: Skipping simplification of ${numUnsupported} primitives: Unsupported draw mode.`);
		}

		// Where simplification removes meshes, we may need to prune leaf nodes.
		if (options.cleanup) {
			await document.transform(
				prune({
					propertyTypes: [PropertyType.ACCESSOR, PropertyType.NODE],
					keepAttributes: true,
					keepIndices: true,
					keepLeaves: false,
				}),
				dedup({ propertyTypes: [PropertyType.ACCESSOR] }),
			);
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

	simplifier.useExperimentalFeatures = true;
	const targetCount = Math.floor(options.ratio * srcVertexCount);
	const dstIndicesArray = simplifier.simplifyPoints(positionArray, 3, targetCount, colorArray, colorStride);
	simplifier.useExperimentalFeatures = false;

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
