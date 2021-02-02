import { Accessor, Document, Logger, Transform, TypedArray } from '@gltf-transform/core';

const NAME = 'unweld';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UnweldOptions {}

const DEFAULT_OPTIONS: UnweldOptions = {};

export function unweld (_options: UnweldOptions = DEFAULT_OPTIONS): Transform {
	_options = {...DEFAULT_OPTIONS, ..._options};

	return (doc: Document): void => {

		const logger = doc.getLogger();
		const visited = new Map<Accessor, Map<Accessor, Accessor>>();

		for (const mesh of doc.getRoot().listMeshes()) {
			for (const prim of mesh.listPrimitives()) {
				const indices = prim.getIndices();
				if (!indices) continue;

				// Vertex attributes.
				for (const srcAttribute of prim.listAttributes()) {
					prim.swap(
						srcAttribute,
						unweldAttribute(srcAttribute, indices, logger, visited)
					);

					// Clean up.
					if (srcAttribute.listParents().length === 1) srcAttribute.dispose();
				}

				// Morph target vertex attributes.
				for (const target of prim.listTargets()) {
					for (const srcAttribute of target.listAttributes()) {
						target.swap(
							srcAttribute,
							unweldAttribute(srcAttribute, indices, logger, visited)
						);

						// Clean up.
						if (srcAttribute.listParents().length === 1) srcAttribute.dispose();
					}
				}

				// Clean up.
				prim.setIndices(null);
				if (indices.listParents().length === 1) indices.dispose();
			}
		}

		logger.debug(`${NAME}: Complete.`);
	};
}

function unweldAttribute(
		srcAttribute: Accessor,
		indices: Accessor,
		logger: Logger,
		visited: Map<Accessor, Map<Accessor, Accessor>>): Accessor {
	if (visited.has(srcAttribute) && visited.get(srcAttribute).has(indices)) {
		logger.debug(`${NAME}: Cache hit for reused attribute, "${srcAttribute.getName()}".`);
		return visited.get(srcAttribute).get(indices);
	}

	const dstAttribute = srcAttribute.clone();
	const ArrayCtor = srcAttribute.getArray().constructor as
		new (len: number) => TypedArray;
	dstAttribute.setArray(
		new ArrayCtor(indices.getCount() * srcAttribute.getElementSize())
	);

	const el = [];
	for (let i = 0; i < indices.getCount(); i++) {
		dstAttribute.setElement(i, srcAttribute.getElement(indices.getScalar(i), el));
	}

	if (!visited.has(srcAttribute)) visited.set(srcAttribute, new Map());
	visited.get(srcAttribute).set(indices, dstAttribute);

	return dstAttribute;
}
