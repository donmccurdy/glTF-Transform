import { type Accessor, type Document, type GLTF, Primitive, PropertyType, type Transform } from '@gltf-transform/core';
import type { MeshoptEncoder } from 'meshoptimizer';
import { compactAttribute } from './compact-primitive.js';
import { prune } from './prune.js';
import { assignDefaults, createTransform, deepListAttributes, SetMap, shallowCloneAccessor } from './utils.js';

const NAME = 'reorder';

/** Options for the {@link reorder} function. */
export interface ReorderOptions {
	/** MeshoptEncoder instance. */
	encoder: unknown;
	/**
	 * Whether the order should be optimal for transmission size (recommended for Web)
	 * or for GPU rendering performance. Default is 'size'.
	 */
	target?: 'size' | 'performance';
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

const REORDER_DEFAULTS: Required<Omit<ReorderOptions, 'encoder'>> = {
	target: 'size',
	cleanup: true,
};

/**
 * Optimizes {@link Mesh} {@link Primitive Primitives} for locality of reference. Choose whether
 * the order should be optimal for transmission size (recommended for Web) or for GPU rendering
 * performance. Requires a MeshoptEncoder instance from the Meshoptimizer library.
 *
 * Example:
 *
 * ```ts
 * import { MeshoptEncoder } from 'meshoptimizer';
 * import { reorder } from '@gltf-transform/functions';
 *
 * await MeshoptEncoder.ready;
 *
 * await document.transform(
 * 	reorder({encoder: MeshoptEncoder})
 * );
 * ```
 *
 * @category Transforms
 */
export function reorder(_options: ReorderOptions): Transform {
	const options = assignDefaults(REORDER_DEFAULTS, _options);
	const encoder = options.encoder as typeof MeshoptEncoder | undefined;

	if (!encoder) {
		throw new Error(`${NAME}: encoder dependency required — install "meshoptimizer".`);
	}

	return createTransform(NAME, async (document: Document): Promise<void> => {
		const logger = document.getLogger();

		await encoder.ready;

		const plan = createLayoutPlan(document);

		for (const srcIndices of plan.indicesToAttributes.keys()) {
			let indicesArray = srcIndices.getArray()!;
			if (!(indicesArray instanceof Uint32Array)) {
				indicesArray = new Uint32Array(indicesArray);
			} else {
				indicesArray = indicesArray.slice();
			}

			// Compute optimal order.
			const [remap, unique] = encoder.reorderMesh(
				indicesArray,
				plan.indicesToMode.get(srcIndices) === Primitive.Mode.TRIANGLES,
				options.target === 'size',
			);

			const dstIndices = shallowCloneAccessor(document, srcIndices);
			dstIndices.setArray(unique <= 65534 ? new Uint16Array(indicesArray) : indicesArray);

			// Update affected primitives.
			for (const srcAttribute of plan.indicesToAttributes.get(srcIndices)) {
				const dstAttribute = shallowCloneAccessor(document, srcAttribute);
				compactAttribute(srcAttribute, srcIndices, remap, dstAttribute, unique);

				for (const prim of plan.indicesToPrimitives.get(srcIndices)) {
					if (prim.getIndices() === srcIndices) {
						prim.swap(srcIndices, dstIndices);
					}

					prim.swap(srcAttribute, dstAttribute);
					for (const target of prim.listTargets()) {
						target.swap(srcAttribute, dstAttribute);
					}
				}
			}
		}

		// Clean up any attributes left unused by earlier cloning.
		if (options.cleanup) {
			await document.transform(
				prune({
					propertyTypes: [PropertyType.ACCESSOR],
					keepAttributes: true,
					keepIndices: true,
				}),
			);
		}

		if (!plan.indicesToAttributes.size) {
			logger.warn(`${NAME}: No qualifying primitives found; may need to weld first.`);
		} else {
			logger.debug(`${NAME}: Complete.`);
		}
	});
}

/** @hidden */
interface LayoutPlan {
	indicesToMode: Map<Accessor, GLTF.MeshPrimitiveMode>;
	indicesToPrimitives: SetMap<Accessor, Primitive>;
	indicesToAttributes: SetMap<Accessor, Accessor>;
	attributesToPrimitives: SetMap<Accessor, Primitive>;
}

/**
 * Constructs a plan for processing vertex streams, based on unique
 * index:attribute[] groups. Where different indices are used with the same
 * attributes, we'll end up splitting the primitives to not share attributes,
 * which appears to be consistent with the Meshopt implementation.
 *
 * @hidden
 */
function createLayoutPlan(document: Document): LayoutPlan {
	const indicesToMode = new Map<Accessor, GLTF.MeshPrimitiveMode>();
	const indicesToPrimitives = new SetMap<Accessor, Primitive>();
	const indicesToAttributes = new SetMap<Accessor, Accessor>();
	const attributesToPrimitives = new SetMap<Accessor, Primitive>();

	for (const mesh of document.getRoot().listMeshes()) {
		for (const prim of mesh.listPrimitives()) {
			const indices = prim.getIndices();
			if (!indices) continue;

			indicesToMode.set(indices, prim.getMode());
			indicesToPrimitives.add(indices, prim);

			for (const attribute of deepListAttributes(prim)) {
				indicesToAttributes.add(indices, attribute);
				attributesToPrimitives.add(attribute, prim);
			}
		}
	}

	return { indicesToPrimitives, indicesToAttributes, indicesToMode, attributesToPrimitives };
}
