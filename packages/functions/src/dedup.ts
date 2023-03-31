import {
	Accessor,
	BufferUtils,
	Document,
	Material,
	Mesh,
	Primitive,
	PrimitiveTarget,
	PropertyType,
	Root,
	Skin,
	Texture,
	Transform,
} from '@gltf-transform/core';
import { createTransform } from './utils.js';

const NAME = 'dedup';

export interface DedupOptions {
	/** List of {@link PropertyType} identifiers to be de-duplicated.*/
	propertyTypes: string[];
}

const DEDUP_DEFAULTS: Required<DedupOptions> = {
	propertyTypes: [
		PropertyType.ACCESSOR,
		PropertyType.MESH,
		PropertyType.TEXTURE,
		PropertyType.MATERIAL,
		PropertyType.SKIN,
	],
};

/**
 * Removes duplicate {@link Accessor}, {@link Mesh}, {@link Texture}, and {@link Material}
 * properties. Partially based on a
 * [gist by mattdesl](https://gist.github.com/mattdesl/aea40285e2d73916b6b9101b36d84da8). Only
 * accessors in mesh primitives, morph targets, and animation samplers are processed.
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
	const options = { ...DEDUP_DEFAULTS, ..._options } as Required<DedupOptions>;

	const propertyTypes = new Set(options.propertyTypes);
	for (const propertyType of options.propertyTypes) {
		if (!DEDUP_DEFAULTS.propertyTypes.includes(propertyType)) {
			throw new Error(`${NAME}: Unsupported deduplication on type "${propertyType}".`);
		}
	}

	return createTransform(NAME, (document: Document): void => {
		const logger = document.getLogger();

		if (propertyTypes.has(PropertyType.ACCESSOR)) dedupAccessors(document);
		if (propertyTypes.has(PropertyType.TEXTURE)) dedupImages(document);
		if (propertyTypes.has(PropertyType.MATERIAL)) dedupMaterials(document);
		if (propertyTypes.has(PropertyType.MESH)) dedupMeshes(document);
		if (propertyTypes.has(PropertyType.SKIN)) dedupSkins(document);

		logger.debug(`${NAME}: Complete.`);
	});
};

function dedupAccessors(document: Document): void {
	const logger = document.getLogger();

	// Find all accessors used for mesh data.
	const indicesAccessors: Set<Accessor> = new Set();
	const attributeAccessors: Set<Accessor> = new Set();
	const inputAccessors: Set<Accessor> = new Set();
	const outputAccessors: Set<Accessor> = new Set();

	const meshes = document.getRoot().listMeshes();
	meshes.forEach((mesh) => {
		mesh.listPrimitives().forEach((primitive) => {
			primitive.listAttributes().forEach((accessor) => attributeAccessors.add(accessor));
			const indices = primitive.getIndices();
			if (indices) indicesAccessors.add(indices);
		});
	});

	for (const animation of document.getRoot().listAnimations()) {
		for (const sampler of animation.listSamplers()) {
			const input = sampler.getInput();
			const output = sampler.getOutput();
			if (input) inputAccessors.add(input);
			if (output) outputAccessors.add(output);
		}
	}

	// Find duplicate accessors of a given type.
	function detectDuplicates(accessors: Accessor[]): Map<Accessor, Accessor> {
		const duplicateAccessors: Map<Accessor, Accessor> = new Map();

		for (let i = 0; i < accessors.length; i++) {
			const a = accessors[i];
			const aData = BufferUtils.toView(a.getArray()!);

			if (duplicateAccessors.has(a)) continue;

			for (let j = i + 1; j < accessors.length; j++) {
				const b = accessors[j];

				if (duplicateAccessors.has(b)) continue;

				if (a.getType() !== b.getType()) continue;
				if (a.getComponentType() !== b.getComponentType()) continue;
				if (a.getCount() !== b.getCount()) continue;
				if (a.getNormalized() !== b.getNormalized()) continue;
				if (BufferUtils.equals(aData, BufferUtils.toView(b.getArray()!))) {
					duplicateAccessors.set(b, a);
				}
			}
		}

		return duplicateAccessors;
	}

	const duplicateIndices = detectDuplicates(Array.from(indicesAccessors));
	logger.debug(`${NAME}: Found ${duplicateIndices.size} duplicates among ${indicesAccessors.size} indices.`);

	const duplicateAttributes = detectDuplicates(Array.from(attributeAccessors));
	logger.debug(
		`${NAME}: Found ${duplicateAttributes.size} duplicates among ${attributeAccessors.size}` + ' attributes.'
	);

	const duplicateInputs = detectDuplicates(Array.from(inputAccessors));
	const duplicateOutputs = detectDuplicates(Array.from(outputAccessors));
	logger.debug(
		`${NAME}: Found ${duplicateInputs.size + duplicateOutputs.size} duplicates among` +
			` ${inputAccessors.size + outputAccessors.size} animation accessors.`
	);

	// Dissolve duplicate vertex attributes and indices.
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

	// Dissolve duplicate animation sampler inputs and outputs.
	for (const animation of document.getRoot().listAnimations()) {
		for (const sampler of animation.listSamplers()) {
			const input = sampler.getInput();
			const output = sampler.getOutput();
			if (input && duplicateInputs.has(input)) {
				sampler.swap(input, duplicateInputs.get(input) as Accessor);
			}
			if (output && duplicateOutputs.has(output)) {
				sampler.swap(output, duplicateOutputs.get(output) as Accessor);
			}
		}
	}
	Array.from(duplicateInputs.keys()).forEach((input) => input.dispose());
	Array.from(duplicateOutputs.keys()).forEach((output) => output.dispose());
}

function dedupMeshes(document: Document): void {
	const logger = document.getLogger();
	const root = document.getRoot();

	// Create Reference -> ID lookup table.
	const refs = new Map<Accessor | Material, number>();
	root.listAccessors().forEach((accessor, index) => refs.set(accessor, index));
	root.listMaterials().forEach((material, index) => refs.set(material, index));

	// For each mesh, create a hashkey.
	const numMeshes = root.listMeshes().length;
	const uniqueMeshes = new Map<string, Mesh>();
	for (const src of root.listMeshes()) {
		// For each mesh, create a hashkey.
		const srcKeyItems = [];
		for (const prim of src.listPrimitives()) {
			srcKeyItems.push(createPrimitiveKey(prim, refs));
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

	logger.debug(`${NAME}: Found ${numMeshes - uniqueMeshes.size} duplicates among ${numMeshes} meshes.`);
}

function dedupImages(document: Document): void {
	const logger = document.getLogger();
	const root = document.getRoot();
	const textures = root.listTextures();
	const duplicates: Map<Texture, Texture> = new Map();

	// Compare each texture to every other texture — O(n²) — and mark duplicates for replacement.
	for (let i = 0; i < textures.length; i++) {
		const a = textures[i];
		const aData = a.getImage();

		if (duplicates.has(a)) continue;

		for (let j = i + 1; j < textures.length; j++) {
			const b = textures[j];
			const bData = b.getImage();

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

	logger.debug(`${NAME}: Found ${duplicates.size} duplicates among ${root.listTextures().length} textures.`);

	Array.from(duplicates.entries()).forEach(([src, dst]) => {
		src.listParents().forEach((property) => {
			if (!(property instanceof Root)) property.swap(src, dst);
		});
		src.dispose();
	});
}

function dedupMaterials(document: Document): void {
	const logger = document.getLogger();
	const root = document.getRoot();
	const materials = root.listMaterials();
	const duplicates = new Map<Material, Material>();
	const skip = new Set(['name']);

	// Compare each material to every other material — O(n²) — and mark duplicates for replacement.
	for (let i = 0; i < materials.length; i++) {
		const a = materials[i];
		if (duplicates.has(a)) continue;

		for (let j = i + 1; j < materials.length; j++) {
			const b = materials[j];
			if (duplicates.has(b)) continue;

			if (a.equals(b, skip)) {
				duplicates.set(b, a);
			}
		}
	}

	logger.debug(`${NAME}: Found ${duplicates.size} duplicates among ${materials.length} materials.`);

	Array.from(duplicates.entries()).forEach(([src, dst]) => {
		src.listParents().forEach((property) => {
			if (!(property instanceof Root)) property.swap(src, dst);
		});
		src.dispose();
	});
}

function dedupSkins(document: Document): void {
	const logger = document.getLogger();
	const root = document.getRoot();
	const skins = root.listSkins();
	const duplicates = new Map<Skin, Skin>();
	const skip = new Set(['name']);

	for (let i = 0; i < skins.length; i++) {
		const a = skins[i];

		if (duplicates.has(a)) continue;

		for (let j = i + 1; j < skins.length; j++) {
			const b = skins[j];
			if (duplicates.has(b)) continue;

			if (a.equals(b, skip)) {
				duplicates.set(b, a);
			}
		}
	}

	logger.debug(`${NAME}: Found ${duplicates.size} duplicates among ${skins.length} skins.`);

	Array.from(duplicates.entries()).forEach(([src, dst]) => {
		src.listParents().forEach((property) => {
			if (!(property instanceof Root)) property.swap(src, dst);
		});
		src.dispose();
	});
}

/** Generates a key unique to the content of a primitive or target. */
function createPrimitiveKey(prim: Primitive | PrimitiveTarget, refs: Map<Accessor | Material, number>): string {
	const primKeyItems = [];
	for (const semantic of prim.listSemantics()) {
		const attribute = prim.getAttribute(semantic)!;
		primKeyItems.push(semantic + ':' + refs.get(attribute));
	}
	if (prim instanceof Primitive) {
		const indices = prim.getIndices();
		if (indices) {
			primKeyItems.push('indices:' + refs.get(indices));
		}
		const material = prim.getMaterial();
		if (material) {
			primKeyItems.push('material:' + refs.get(material));
		}
		primKeyItems.push('mode:' + prim.getMode());
		for (const target of prim.listTargets()) {
			primKeyItems.push('target:' + createPrimitiveKey(target, refs));
		}
	}
	return primKeyItems.join(',');
}
