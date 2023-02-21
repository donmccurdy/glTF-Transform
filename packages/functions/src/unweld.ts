
import type { Accessor, Document, ILogger, Transform, TypedArray } from '@gltf-transform/core';
import { createTransform, formatDeltaOp } from './utils.js';

const NAME = 'unweld';

/** Options for the {@link unweld} function. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UnweldOptions {}

const UNWELD_DEFAULTS: UnweldOptions = {};

/**
 * De-index {@link Primitive}s, disconnecting any shared vertices. This operation will generally
 * increase the number of vertices in a mesh, but may be helpful for some geometry operations or
 * for creating hard edges.
 *
 * No options are currently implemented for this function.
 */
export function unweld(_options: UnweldOptions = UNWELD_DEFAULTS): Transform {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const options = { ...UNWELD_DEFAULTS, ..._options } as Required<UnweldOptions>;

	return createTransform(NAME, (doc: Document): void => {
		const logger = doc.getLogger();
		const visited = new Map<Accessor, Map<Accessor, Accessor>>();

		for (const mesh of doc.getRoot().listMeshes()) {
			for (const prim of mesh.listPrimitives()) {
				const indices = prim.getIndices();
				if (!indices) continue;

				const srcVertexCount = prim.getAttribute('POSITION')!.getCount();

				// Vertex attributes.
				for (const srcAttribute of prim.listAttributes()) {
					prim.swap(srcAttribute, unweldAttribute(srcAttribute, indices, logger, visited));

					// Clean up.
					if (srcAttribute.listParents().length === 1) srcAttribute.dispose();
				}

				// Morph target vertex attributes.
				for (const target of prim.listTargets()) {
					for (const srcAttribute of target.listAttributes()) {
						target.swap(srcAttribute, unweldAttribute(srcAttribute, indices, logger, visited));

						// Clean up.
						if (srcAttribute.listParents().length === 1) srcAttribute.dispose();
					}
				}

				const dstVertexCount = prim.getAttribute('POSITION')!.getCount();
				logger.debug(`${NAME}: ${formatDeltaOp(srcVertexCount, dstVertexCount)} vertices.`);

				// Clean up.
				prim.setIndices(null);
				if (indices.listParents().length === 1) indices.dispose();
			}
		}

		logger.debug(`${NAME}: Complete.`);
	});
}

function unweldAttribute(
	srcAttribute: Accessor,
	indices: Accessor,
	logger: ILogger,
	visited: Map<Accessor, Map<Accessor, Accessor>>
): Accessor {
	if (visited.has(srcAttribute) && visited.get(srcAttribute)!.has(indices)) {
		logger.debug(`${NAME}: Cache hit for reused attribute, "${srcAttribute.getName()}".`);
		return visited.get(srcAttribute)!.get(indices)!;
	}

	const dstAttribute = srcAttribute.clone();
	const ArrayCtor = srcAttribute.getArray()!.constructor as new (len: number) => TypedArray;
	dstAttribute.setArray(new ArrayCtor(indices.getCount() * srcAttribute.getElementSize()));

	const el: number[] = [];
	for (let i = 0; i < indices.getCount(); i++) {
		dstAttribute.setElement(i, srcAttribute.getElement(indices.getScalar(i), el));
	}

	if (!visited.has(srcAttribute)) visited.set(srcAttribute, new Map());
	visited.get(srcAttribute)!.set(indices, dstAttribute);

	return dstAttribute;
}
