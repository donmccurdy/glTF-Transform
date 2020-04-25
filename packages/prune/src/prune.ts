import { Accessor, BufferUtils, Container, Logger, LoggerVerbosity, Material, Texture } from '@gltf-transform/core';

const prune = function (container: Container): void {
	const logger = new Logger('@gltf-transform/prune', LoggerVerbosity.INFO);
	pruneAccessors(logger, container);
	pruneImages(logger, container);
}

function pruneAccessors(logger: Logger, container: Container): void {
	// Find all accessors used for mesh data.
	const indicesAccessors: Set<Accessor> = new Set();
	const attributeAccessors: Set<Accessor> = new Set();

	const meshes = container.getRoot().listMeshes();
	meshes.forEach((mesh) => {
		mesh.listPrimitives().forEach((primitive) => {
			primitive.listAttributes().forEach((accessor) => (attributeAccessors.add(accessor)));
			if (primitive.getIndices()) {
				indicesAccessors.add(primitive.getIndices());
			}
		})
	});

	// Find duplicate mesh accessors.
	function detectDuplicates(accessors: Accessor[]): Map<Accessor, Accessor> {
		const duplicateAccessors: Map<Accessor, Accessor> = new Map();

		for (let i = 0; i < accessors.length; i++) {
			const a = accessors[i];
			const aData = a.getArray().slice().buffer;

			if (duplicateAccessors.has(a)) continue;

			for (let j = 0; j < accessors.length; j++) {
				const b = accessors[j];

				if (a === b) continue;
				if (duplicateAccessors.has(b)) continue;

				if (a.getType() !== b.getType()) continue;
				if (a.getComponentType() !== b.getComponentType()) continue;
				if (a.getCount() !== b.getCount()) continue;
				if (a.getNormalized() !== b.getNormalized()) continue;
				if (BufferUtils.equals(aData, b.getArray().slice().buffer)) {
					duplicateAccessors.set(b, a);
				}
			}
		}

		return duplicateAccessors;
	}

	const duplicateIndices = detectDuplicates(Array.from(indicesAccessors));
	logger.info(`Duplicate indices: ${duplicateIndices.size} of ${indicesAccessors.size}.`);

	const duplicateAttributes = detectDuplicates(Array.from(attributeAccessors));
	logger.info(`Duplicate attributes: ${duplicateAttributes.size} of ${attributeAccessors.size}.`);

	// Dissolve duplicates.
	meshes.forEach((mesh) => {
		mesh.listPrimitives().forEach((primitive) => {
			primitive.listAttributes().forEach((accessor) => {
				if (duplicateAttributes.has(accessor)) {
					primitive.swap(accessor, duplicateAttributes.get(accessor));
				}
			});
			const indices = primitive.getIndices();
			if (indices && duplicateIndices.has(indices)) {
				primitive.swap(indices, duplicateIndices.get(indices));
			}
		})
	});
	Array.from(duplicateIndices.keys()).forEach((indices) => indices.dispose());
	Array.from(duplicateAttributes.keys()).forEach((attribute) => attribute.dispose());
}

function pruneImages(logger: Logger, container: Container): void {
	const root = container.getRoot();
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
			if (a.getSize()[0] !== b.getSize()[0]) continue;
			if (a.getSize()[1] !== b.getSize()[1]) continue;
			if (BufferUtils.equals(aData, bData)) {
				duplicates.set(b, a);
			}
		}
	}

	Array.from(duplicates.entries()).forEach(([src, dst]) => {
		src.listParents().forEach((property) => {
			// Skip Root.
			if (property instanceof Material) property.swap(src, dst);
		});
		src.dispose();
	});
}

export { prune };
