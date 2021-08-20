import { Accessor, Document, GLTF, Primitive, PropertyType, Transform } from '@gltf-transform/core';
import { prune } from './prune';
import { SetMap } from './utils';
import type { MeshoptEncoder } from 'meshoptimizer';

const NAME = 'reorder';

/** Options for the {@link reorder} function. */
export interface ReorderOptions {
	/** MeshoptEncoder instance. */
	encoder?: typeof MeshoptEncoder,
	/**
	 * Whether the order should be optimal for transmission size (recommended for Web)
	 * or for GPU rendering performance. Default is 'size'.
	 */
	target?: 'size' | 'performance',
}

const REORDER_DEFAULTS: Required<Omit<ReorderOptions, 'encoder'>> = {
	target: 'size',
};

interface LayoutPlan {
	indicesToMode: Map<Accessor, GLTF.MeshPrimitiveMode>;
	indicesToAttributes: SetMap<Accessor, Accessor>;
	attributesToPrimitives: SetMap<Accessor, Primitive>;
}

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
 * await document.transform(
 * 	reorder({encoder: MeshoptEncoder})
 * );
 * ```
 */
export function reorder (_options: ReorderOptions = REORDER_DEFAULTS): Transform {
	const options = {...REORDER_DEFAULTS, ..._options} as Required<ReorderOptions>;
	const encoder = options.encoder;

	return async (doc: Document): Promise<void> => {
		const logger = doc.getLogger();

		await encoder.ready;

		const plan = preprocessPrimitives(doc);

		for (const srcIndices of plan.indicesToAttributes.keys()) {
			const dstIndices = srcIndices.clone();
			let indicesArray = dstIndices.getArray()!.slice();
			if (!(indicesArray instanceof Uint32Array)) {
				indicesArray = new Uint32Array(indicesArray);
			}

			// Compute optimal order.
			const [remap, unique] = encoder.reorderMesh(
				indicesArray,
				plan.indicesToMode.get(srcIndices) === Primitive.Mode.TRIANGLES,
				options.target === 'size'
			);

			dstIndices.setArray(unique <= 65534 ? new Uint16Array(indicesArray) : indicesArray);

			// Update affected primitives.
			for (const srcAttribute of plan.indicesToAttributes.get(srcIndices)) {
				const dstAttribute = srcAttribute.clone();
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
		await doc.transform(prune({propertyTypes: [PropertyType.ACCESSOR]}));

		if (!plan.indicesToAttributes.size) {
			logger.warn(`${NAME}: No qualifying primitives found; may need to weld first.`);
		} else {
			logger.debug(`${NAME}: Complete.`);
		}
	};
}

function remapAttribute(attribute: Accessor, remap: Uint32Array, dstCount: number) {
	const elementSize = attribute.getElementSize();
	const srcCount = attribute.getCount();
	const srcArray = attribute.getArray()!;
	const dstArray = srcArray.slice(0, dstCount * elementSize);

	for (let i = 0; i < srcCount; i++) {
		for (let j = 0; j < elementSize; j++) {
			dstArray[remap[i] * elementSize + j] = srcArray[i * elementSize + j];
		}
	}

	attribute.setArray(dstArray);
}

/**
 * Constructs a plan for creating optimal vertex cache order, based on unique
 * index:attribute[] groups. Where different indices are used with the same
 * attributes, we'll end up splitting the primitives to not share attributes,
 * which appears to be consistent with the Meshopt implementation.
 */
function preprocessPrimitives(doc: Document): LayoutPlan {
	const indicesToAttributes = new SetMap<Accessor, Accessor>();
	const indicesToMode = new Map<Accessor, GLTF.MeshPrimitiveMode>();
	const attributesToPrimitives = new SetMap<Accessor, Primitive>();

	for (const mesh of doc.getRoot().listMeshes()) {
		for (const prim of mesh.listPrimitives()) {
			const indices = prim.getIndices();
			if (!indices) continue;

			indicesToMode.set(indices, prim.getMode());

			for (const attribute of listAttributes(prim)) {
				indicesToAttributes.add(indices, attribute);
				attributesToPrimitives.add(attribute, prim);
			}
		}
	}

	return {indicesToAttributes, indicesToMode, attributesToPrimitives};
}

function listAttributes(prim: Primitive): Accessor[] {
	const accessors: Accessor[] = [];

	for (const attribute of prim.listAttributes()) {
		accessors.push(attribute);
	}
	for (const target of prim.listTargets()) {
		for (const attribute of target.listAttributes()) {
			accessors.push(attribute);
		}
	}

	return Array.from(new Set(accessors));
}
