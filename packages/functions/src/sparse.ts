import { Document, MathUtils, Transform } from '@gltf-transform/core';
import { assignDefaults, createTransform } from './utils.js';

const NAME = 'sparse';

/** Options for the {@link sparse} function. */
export interface SparseOptions {
	/**
	 * Threshold ratio used to determine when an accessor should be sparse.
	 * Default: 1 / 3.
	 */
	ratio: number;
}

const SPARSE_DEFAULTS: Required<SparseOptions> = {
	ratio: 1 / 3,
};

/**
 * Scans all {@link Accessor Accessors} in the Document, detecting whether each Accessor
 * would benefit from sparse data storage. Currently, sparse data storage is used only
 * when many values (>= ratio) are zeroes. Particularly for assets using morph target
 * ("shape key") animation, sparse data storage may significantly reduce file sizes.
 *
 * Example:
 *
 * ```ts
 * import { sparse } from '@gltf-transform/functions';
 *
 * accessor.getArray(); // → [ 0, 0, 0, 0, 0, 25.0, 0, 0, ... ]
 * accessor.getSparse(); // → false
 *
 * await document.transform(sparse({ratio: 1 / 10}));
 *
 * accessor.getSparse(); // → true
 * ```
 *
 * @experimental
 * @category Transforms
 */
export function sparse(_options: SparseOptions = SPARSE_DEFAULTS): Transform {
	const options = assignDefaults(SPARSE_DEFAULTS, _options);

	const ratio = options.ratio;
	if (ratio < 0 || ratio > 1) {
		throw new Error(`${NAME}: Ratio must be between 0 and 1.`);
	}

	return createTransform(NAME, (document: Document): void => {
		const root = document.getRoot();
		const logger = document.getLogger();

		let modifiedCount = 0;

		for (const accessor of root.listAccessors()) {
			const count = accessor.getCount();
			const base = Array(accessor.getElementSize()).fill(0);
			const el = Array(accessor.getElementSize()).fill(0);

			let nonZeroCount = 0;
			for (let i = 0; i < count; i++) {
				accessor.getElement(i, el);
				if (!MathUtils.eq(el, base, 0)) nonZeroCount++;
				if (nonZeroCount / count >= ratio) break;
			}

			const sparse = nonZeroCount / count < ratio;
			if (sparse !== accessor.getSparse()) {
				accessor.setSparse(sparse);
				modifiedCount++;
			}
		}

		logger.debug(`${NAME}: Updated ${modifiedCount} accessors.`);
		logger.debug(`${NAME}: Complete.`);
	});
}
