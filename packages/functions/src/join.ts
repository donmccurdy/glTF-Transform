import type { Primitive } from '@gltf-transform/core';
import type { Document, Transform, TransformContext } from '@gltf-transform/core';
import { createTransform } from './utils';

// 📍 TODO(design): Have separate flatten() and join() transforms, or combine them?
//      ... probably flatten() is complex enough to be its own thing.
// 📍 TODO(test): Do all other transforms support continuous streams?

const NAME = 'join';

/** Options for the {@link join} function. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JoinOptions {
	applyTransforms?: boolean;
	joinStreams?: boolean;
	joinPrimitives?: boolean;
}

const JOIN_DEFAULTS: Required<JoinOptions> = {
	applyTransforms: true,
	joinStreams: true,
	joinPrimitives: true,
};

/**
 * Index {@link Primitive}s and (optionally) merge similar vertices.
 */
export function join(_options: JoinOptions = JOIN_DEFAULTS): Transform {
	const options = { ...JOIN_DEFAULTS, ..._options } as Required<JoinOptions>;

	return createTransform(NAME, async (doc: Document, context?: TransformContext): Promise<void> => {
		const logger = doc.getLogger();

		// (1) flatten scene graph, preserving animation
		// (2) (optional) apply transforms to vertex data
		// (3) (optional) merge compatible vertex streams, sorting by material
		// (4) (optional) merge primitives by material

		for (const mesh of doc.getRoot().listMeshes()) {
			for (const prim of mesh.listPrimitives()) {
				//
			}
		}

		logger.debug(`${NAME}: Complete.`);
	});
}

export function joinPrimitives(_prims: Primitive[]) {
	//
}
