import type { Document, Transform, vec3 } from '@gltf-transform/core';
import { unweld } from './unweld.js';
import { assignDefaults, createTransform } from './utils.js';
import { normalize } from 'gl-matrix/vec3';

const NAME = 'normals';

/** Options for the {@link normals} function. */
export interface NormalsOptions {
	/** Whether to overwrite existing `NORMAL` attributes. */
	overwrite?: boolean;
}

const NORMALS_DEFAULTS: Required<NormalsOptions> = {
	overwrite: false,
};

/**
 * Generates flat vertex normals for mesh primitives.
 *
 * Example:
 *
 * ```ts
 * import { normals } from '@gltf-transform/functions';
 *
 * await document.transform(normals({overwrite: true}));
 * ```
 *
 * @category Transforms
 */
export function normals(_options: NormalsOptions = NORMALS_DEFAULTS): Transform {
	const options = assignDefaults(NORMALS_DEFAULTS, _options);

	return createTransform(NAME, async (document: Document): Promise<void> => {
		const logger = document.getLogger();
		let modified = 0;

		await document.transform(unweld());

		for (const mesh of document.getRoot().listMeshes()) {
			for (const prim of mesh.listPrimitives()) {
				const position = prim.getAttribute('POSITION')!;
				let normal = prim.getAttribute('NORMAL');

				if (options.overwrite && normal) {
					normal.dispose();
				} else if (normal) {
					logger.debug(`${NAME}: Skipping primitive: NORMAL found.`);
					continue;
				}

				normal = document
					.createAccessor()
					.setArray(new Float32Array(position.getCount() * 3))
					.setType('VEC3');

				const a = [0, 0, 0] as vec3;
				const b = [0, 0, 0] as vec3;
				const c = [0, 0, 0] as vec3;

				for (let i = 0; i < position.getCount(); i += 3) {
					position.getElement(i + 0, a);
					position.getElement(i + 1, b);
					position.getElement(i + 2, c);

					const faceNormal = computeNormal(a, b, c);

					normal.setElement(i + 0, faceNormal);
					normal.setElement(i + 1, faceNormal);
					normal.setElement(i + 2, faceNormal);
				}

				prim.setAttribute('NORMAL', normal);
				modified++;
			}
		}

		if (!modified) {
			logger.warn(`${NAME}: No qualifying primitives found. See debug output.`);
		} else {
			logger.debug(`${NAME}: Complete.`);
		}
	});
}

// https://stackoverflow.com/a/23709352/1314762
function computeNormal(a: vec3, b: vec3, c: vec3): vec3 {
	const A = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
	const B = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
	const n = [
		A[1] * B[2] - A[2] * B[1], //
		A[2] * B[0] - A[0] * B[2],
		A[0] * B[1] - A[1] * B[0],
	] as vec3;
	return normalize([0, 0, 0], n) as vec3;
}
