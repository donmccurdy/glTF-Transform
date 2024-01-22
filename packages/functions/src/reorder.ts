import { Accessor, Document, GLTF, Primitive, PropertyType, Transform } from '@gltf-transform/core';
import { prune } from './prune.js';
import { createTransform, deepListAttributes, remapAttribute, SetMap, shallowCloneAccessor } from './utils.js';
import type { MeshoptEncoder } from 'meshoptimizer';

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
}

const REORDER_DEFAULTS: Required<Omit<ReorderOptions, 'encoder'>> = {
	target: 'size',
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
	const options = { ...REORDER_DEFAULTS, ..._options } as Required<ReorderOptions>;
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
				remapAttribute(dstAttribute, remap, unique);
				for (const prim of plan.attributesToPrimitives.get(srcAttribute)) {
					if (prim.getIndices() === srcIndices) {
						prim.swap(srcIndices, dstIndices);
					}
					if (prim.getIndices() === dstIndices) {
						prim.swap(srcAttribute, dstAttribute);
						for (const target of prim.listTargets()) {
							target.swap(srcAttribute, dstAttribute);
						}
					}
				}
			}
		}

		// Clean up any attributes left unused by earlier cloning.
		await document.transform(
			prune({
				propertyTypes: [PropertyType.ACCESSOR],
				keepAttributes: true,
				keepIndices: true,
			}),
		);

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
	const indicesToAttributes = new SetMap<Accessor, Accessor>();
	const indicesToMode = new Map<Accessor, GLTF.MeshPrimitiveMode>();
	const attributesToPrimitives = new SetMap<Accessor, Primitive>();

	for (const mesh of document.getRoot().listMeshes()) {
		for (const prim of mesh.listPrimitives()) {
			const indices = prim.getIndices();
			if (!indices) continue;

			indicesToMode.set(indices, prim.getMode());

			for (const attribute of deepListAttributes(prim)) {
				indicesToAttributes.add(indices, attribute);
				attributesToPrimitives.add(attribute, prim);
			}
		}
	}

	return { indicesToAttributes, indicesToMode, attributesToPrimitives };
}
