import { Accessor, BufferUtils, Document, Logger, Mesh, PropertyType, Root, Texture, Transform } from '@gltf-transform/core';

const NAME = 'dedup';



export interface DedupOptions {
	/** List of {@link PropertyType} identifiers to be de-duplicated.*/
	propertyTypes: string[];
}

const DEDUP_DEFAULTS: Required<DedupOptions> = {
	propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH, PropertyType.TEXTURE],
};

/**
 * Removes duplicate {@link Accessor}, {@link Mesh}, and {@link Texture} properties. Based on a
 * [gist by mattdesl](https://gist.github.com/mattdesl/aea40285e2d73916b6b9101b36d84da8).
 *
 * Example:
 *
 * ```ts
 * document.getRoot().listMeshes(); // → [Mesh, Mesh, Mesh]
 *
 * await document.transform(dedup({propertyTypes: [PropertyType.MESH]}));
 *
 * document.getRoot().listMeshes(); // → [Mesh]
 * ```
 */
export const dedup = function (_options: DedupOptions = DEDUP_DEFAULTS): Transform {
	const options = {...DEDUP_DEFAULTS, ..._options} as Required<DedupOptions>;

	const propertyTypes = new Set(options.propertyTypes);
	for (const propertyType of options.propertyTypes) {
		if (!DEDUP_DEFAULTS.propertyTypes.includes(propertyType)) {
			throw new Error(`${NAME}: Unsupported deduplication on type "${propertyType}".`);
		}
	}

	return (doc: Document): void =>  {
		const logger = doc.getLogger();

		if (propertyTypes.has(PropertyType.ACCESSOR)) dedupAccessors(logger, doc);
		if (propertyTypes.has(PropertyType.MESH)) dedupMeshes(logger, doc);
		if (propertyTypes.has(PropertyType.TEXTURE)) dedupImages(logger, doc);

		logger.debug(`${NAME}: Complete.`);
	};

};

function dedupAccessors(logger: Logger, doc: Document): void {
	// Find all accessors used for mesh data.
	const indicesAccessors: Set<Accessor> = new Set();
	const attributeAccessors: Set<Accessor> = new Set();

	const meshes = doc.getRoot().listMeshes();
	meshes.forEach((mesh) => {
		mesh.listPrimitives().forEach((primitive) => {
			primitive.listAttributes().forEach((accessor) => (attributeAccessors.add(accessor)));
			const indices = primitive.getIndices();
			if (indices) indicesAccessors.add(indices);
		});
	});

	// Find duplicate mesh accessors.
	function detectDuplicates(accessors: Accessor[]): Map<Accessor, Accessor> {
		const duplicateAccessors: Map<Accessor, Accessor> = new Map();

		for (let i = 0; i < accessors.length; i++) {
			const a = accessors[i];
			const aData = a.getArray()!.slice().buffer;

			if (duplicateAccessors.has(a)) continue;

			for (let j = 0; j < accessors.length; j++) {
				const b = accessors[j];

				if (a === b) continue;
				if (duplicateAccessors.has(b)) continue;

				if (a.getType() !== b.getType()) continue;
				if (a.getComponentType() !== b.getComponentType()) continue;
				if (a.getCount() !== b.getCount()) continue;
				if (a.getNormalized() !== b.getNormalized()) continue;
				if (BufferUtils.equals(aData, b.getArray()!.slice().buffer)) {
					duplicateAccessors.set(b, a);
				}
			}
		}

		return duplicateAccessors;
	}

	const duplicateIndices = detectDuplicates(Array.from(indicesAccessors));
	logger.debug(
		`${NAME}: Found ${duplicateIndices.size} duplicates among ${indicesAccessors.size} indices.`
	);

	const duplicateAttributes = detectDuplicates(Array.from(attributeAccessors));
	logger.debug(
		`${NAME}: Found ${duplicateAttributes.size} duplicates among ${attributeAccessors.size}`
		+ ' attributes.'
	);

	// Dissolve duplicates.
	meshes.forEach((mesh) => {
		mesh.listPrimitives().forEach((primitive) => {
			primitive.listAttributes().forEach((accessor) => {
				if (duplicateAttributes.has(accessor)) {
					primitive.swap(accessor, duplicateAttributes.get(accessor) as Accessor);
				}
			});
			const indices = primitive.getIndices();
			if (indices && duplicateIndices.has(indices)) {
				primitive.swap(indices, duplicateIndices.get(indices) as Accessor);
			}
		});
	});
	Array.from(duplicateIndices.keys()).forEach((indices) => indices.dispose());
	Array.from(duplicateAttributes.keys()).forEach((attribute) => attribute.dispose());
}

function dedupMeshes(logger: Logger, doc: Document): void {
	const root = doc.getRoot();

	// Create Accessor -> ID lookup table.
	const accessorIndices = new Map<Accessor, number>();
	root.listAccessors().forEach((accessor, index) => {
		accessorIndices.set(accessor, index);
	});

	// For each mesh, create a hashkey.
	const numMeshes = root.listMeshes().length;
	const uniqueMeshes = new Map<string, Mesh>();
	for (const src of root.listMeshes()) {
		// For each mesh, create a hashkey.
		const srcKeyItems = [];
		for (const prim of src.listPrimitives()) {
			const primKeyItems = [];
			for (const semantic of prim.listSemantics()) {
				const attribute = prim.getAttribute(semantic)!;
				primKeyItems.push(semantic + ':' + accessorIndices.get(attribute));
			}
			const indices = prim.getIndices();
			if (indices) {
				primKeyItems.push('indices:' + accessorIndices.get(indices));
			}
			srcKeyItems.push(primKeyItems.join(','));
		}

		// If another mesh exists with the same key, replace all instances with that, and dispose
		// of the duplicate. If not, just cache it.
		const meshKey = srcKeyItems.join(';');
		if (uniqueMeshes.has(meshKey)) {
			const targetMesh = uniqueMeshes.get(meshKey)!;
			src.listParents().forEach((parent) => {
				if (parent.propertyType !== PropertyType.ROOT) {
					parent.swap(src, targetMesh);
				}
			});
			src.dispose();
		} else {
			uniqueMeshes.set(meshKey, src);
		}
	}

	logger.debug(
		`${NAME}: Found ${numMeshes - uniqueMeshes.size} duplicates among ${numMeshes} meshes.`
	);
}

function dedupImages(logger: Logger, doc: Document): void {
	const root = doc.getRoot();
	const textures = root.listTextures();
	const duplicates: Map<Texture, Texture> = new Map();

	for (let i = 0; i < textures.length; i++) {
		const a = textures[i];
		const aData = a.getImage();

		if (duplicates.has(a)) continue;

		for (let j = 0; j < textures.length; j++) {
			const b = textures[j];
			const bData = b.getImage();

			if (a === b) continue;
			if (duplicates.has(b)) continue;

			// URIs are intentionally not compared.
			if (a.getMimeType() !== b.getMimeType()) continue;

			const aSize = a.getSize();
			const bSize = b.getSize();
			if (!aSize || !bSize) continue;
			if (aSize[0] !== bSize[0]) continue;
			if (aSize[1] !== bSize[1]) continue;
			if (!aData || !bData) continue;
			if (BufferUtils.equals(aData, bData)) {
				duplicates.set(b, a);
			}
		}
	}

	logger.debug(
		`${NAME}: Found ${duplicates.size} duplicates among ${root.listTextures().length} textures.`
	);

	Array.from(duplicates.entries()).forEach(([src, dst]) => {
		src.listParents().forEach((property) => {
			if (!(property instanceof Root)) property.swap(src, dst);
		});
		src.dispose();
	});
}
