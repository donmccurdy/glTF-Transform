import type { Document, Transform } from '@gltf-transform/core';
import { createTransform } from './utils.js';

const NAME = 'unpartition';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UnpartitionOptions {}
const UNPARTITION_DEFAULTS: Required<UnpartitionOptions> = {};

/**
 * Removes partitions from the binary payload of a glTF file, so that the asset
 * contains at most one (1) `.bin` {@link Buffer}. This process reverses the
 * changes from a {@link partition} transform.
 *
 * Example:
 *
 * ```ts
 * document.getRoot().listBuffers(); // → [Buffer, Buffer, ...]
 *
 * await document.transform(unpartition());
 *
 * document.getRoot().listBuffers(); // → [Buffer]
 * ```
 */
const unpartition = (_options: UnpartitionOptions = UNPARTITION_DEFAULTS): Transform => {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const options = { ...UNPARTITION_DEFAULTS, ..._options } as Required<UnpartitionOptions>;

	return createTransform(NAME, async (document: Document): Promise<void> => {
		const logger = document.getLogger();

		const buffer = document.getRoot().listBuffers()[0];
		document
			.getRoot()
			.listAccessors()
			.forEach((a) => a.setBuffer(buffer));
		document
			.getRoot()
			.listBuffers()
			.forEach((b, index) => (index > 0 ? b.dispose() : null));

		logger.debug(`${NAME}: Complete.`);
	});
};

export { unpartition };
