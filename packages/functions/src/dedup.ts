import {
	type Accessor,
	type Document,
	type Material,
	type Mesh,
	type Property,
	PropertyType,
	Root,
	type Skin,
	type Texture,
	type Transform,
} from '@gltf-transform/core';
import { assignDefaults, createTransform, deepListAttributes, shallowEqualsArray } from './utils.js';

const NAME = 'dedup';

export interface DedupOptions {
	/** Keep properties with unique names, even if they are duplicates. */
	keepUniqueNames?: boolean;
	/** List of {@link PropertyType} identifiers to be de-duplicated.*/
	propertyTypes?: string[];
}

const DEDUP_DEFAULTS: Required<DedupOptions> = {
	keepUniqueNames: false,
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
 *
 * @category Transforms
 */
export function dedup(_options: DedupOptions = DEDUP_DEFAULTS): Transform {
	const options = assignDefaults(DEDUP_DEFAULTS, _options);

	const propertyTypes = new Set(options.propertyTypes);
	for (const propertyType of options.propertyTypes) {
		if (!DEDUP_DEFAULTS.propertyTypes.includes(propertyType)) {
			throw new Error(`${NAME}: Unsupported deduplication on type "${propertyType}".`);
		}
	}

	return createTransform(NAME, (document: Document): void => {
		const logger = document.getLogger();

		const cache = new Map<Property, number>();

		// console.time('ACCESSOR');
		if (propertyTypes.has(PropertyType.ACCESSOR)) dedupAccessors(document, cache);
		// console.timeEnd('ACCESSOR');

		// console.time('TEXTURE');
		if (propertyTypes.has(PropertyType.TEXTURE)) dedupImages(document, cache, options);
		// console.timeEnd('TEXTURE');

		// console.time('MATERIAL');
		if (propertyTypes.has(PropertyType.MATERIAL)) dedupMaterials(document, cache, options);
		// console.timeEnd('MATERIAL');

		// console.time('MESH');
		if (propertyTypes.has(PropertyType.MESH)) dedupMeshes(document, cache, options);
		// console.timeEnd('MESH');

		// console.time('SKIN');
		if (propertyTypes.has(PropertyType.SKIN)) dedupSkins(document, cache, options);
		// console.timeEnd('SKIN');

		logger.debug(`${NAME}: Complete.`);
	});
}

function dedupAccessors(document: Document, cache: Map<Property, number>): void {
	const logger = document.getLogger();
	const root = document.getRoot();

	const skip = new Set(['name', 'buffer']);
	const duplicates = new Set<Accessor>();

	// Group and merge by usage.
	const usage = {
		attribute: new Map<number, Accessor>(),
		indices: new Map<number, Accessor>(),
		input: new Map<number, Accessor>(),
		output: new Map<number, Accessor>(),
	};

	for (const mesh of document.getRoot().listMeshes()) {
		for (const prim of mesh.listPrimitives()) {
			checkAccessor(prim.getIndices(), usage.indices);
			for (const attribute of deepListAttributes(prim)) {
				checkAccessor(attribute, usage.attribute);
			}
		}
	}

	for (const animation of document.getRoot().listAnimations()) {
		for (const sampler of animation.listSamplers()) {
			checkAccessor(sampler.getInput(), usage.input);
			checkAccessor(sampler.getOutput(), usage.output);
		}
	}

	// For each 'src' accessor, check if there's a duplicate 'dst' with the same usage. If so,
	// replace references from src to dst, and mark src for disposal.
	function checkAccessor(src: Accessor | null, usage: Map<number, Accessor>): void {
		if (!src) return;

		const hash = src.toHash(skip, cache);
		const dst = usage.get(hash);
		if (!dst) {
			usage.set(hash, src);
			return;
		}

		if (dst === src) {
			return;
		}

		for (const parent of src.listParents()) {
			if (parent !== root) {
				parent.swap(src, dst);
			}
		}

		duplicates.add(src);
	}

	logger.debug(`${NAME}: Removed ${duplicates.size} duplicate accessors.`);
	for (const duplicate of duplicates) {
		duplicate.dispose();
	}
}

function dedupMeshes(document: Document, cache: Map<Property, number>, options: Required<DedupOptions>): void {
	const logger = document.getLogger();
	const root = document.getRoot();

	const skip = new Set(options.keepUniqueNames ? [] : ['name']);
	const meshes = new Map<number, Mesh>();
	let duplicates = 0;

	for (const src of root.listMeshes()) {
		const hash = src.toHash(skip, cache);
		const dst = meshes.get(hash);
		if (!dst) {
			meshes.set(hash, src);
			continue;
		}

		for (const parent of src.listParents()) {
			if (parent !== root) {
				parent.swap(src, dst);
			}
		}

		src.dispose();
		duplicates++;
	}

	logger.debug(`${NAME}: Removed ${duplicates} duplicate meshes.`);
}

function dedupImages(document: Document, cache: Map<Property, number>, options: Required<DedupOptions>): void {
	const logger = document.getLogger();
	const root = document.getRoot();

	const skip = new Set(['uri']);
	if (!options.keepUniqueNames) skip.add('name');

	const textures = new Map<number, Texture>();
	let duplicates = 0;

	for (const src of root.listTextures()) {
		const hash = src.toHash(skip, cache);
		const dst = textures.get(hash);
		if (!dst) {
			textures.set(hash, src);
			continue;
		}

		for (const parent of src.listParents()) {
			if (parent !== root) {
				parent.swap(src, dst);
			}
		}

		src.dispose();
		duplicates++;
	}

	logger.debug(`${NAME}: Removed ${duplicates} duplicate textures.`);
}

function dedupMaterials(document: Document, cache: Map<Property, number>, options: Required<DedupOptions>): void {
	const logger = document.getLogger();
	const root = document.getRoot();

	const skip = new Set<string>();
	if (!options.keepUniqueNames) skip.add('name');

	const modifierCache = new Map<Material, boolean>();
	const materials = new Map<number, Material>();
	let duplicates = 0;

	for (const src of root.listMaterials()) {
		if (hasModifier(src, modifierCache)) continue;

		const hash = src.toHash(skip, cache);
		const dst = materials.get(hash);
		if (!dst) {
			materials.set(hash, src);
			continue;
		}

		for (const parent of src.listParents()) {
			parent.swap(src, dst);
		}

		src.dispose();
		duplicates++;
	}

	logger.debug(`${NAME}: Removed ${duplicates} duplicate materials.`);
}

// TODO: Use toHash().
function dedupSkins(document: Document, cache: Map<Property, number>, options: Required<DedupOptions>): void {
	const logger = document.getLogger();
	const root = document.getRoot();
	const skins = root.listSkins();
	const duplicates = new Map<Skin, Skin>();
	const skip = new Set(['joints']);

	if (!options.keepUniqueNames) {
		skip.add('name');
	}

	for (let i = 0; i < skins.length; i++) {
		const a = skins[i];

		if (duplicates.has(a)) continue;

		for (let j = i + 1; j < skins.length; j++) {
			const b = skins[j];
			if (duplicates.has(b)) continue;

			// Check joints with shallow equality, not deep equality.
			// See: https://github.com/KhronosGroup/glTF-Sample-Models/tree/master/2.0/RecursiveSkeletons
			if (a.equals(b, skip) && shallowEqualsArray(a.listJoints(), b.listJoints())) {
				duplicates.set(b, a);
			}
		}
	}

	logger.debug(`${NAME}: Merged ${duplicates.size} of ${skins.length} skins.`);

	Array.from(duplicates.entries()).forEach(([src, dst]) => {
		src.listParents().forEach((property) => {
			if (!(property instanceof Root)) property.swap(src, dst);
		});
		src.dispose();
	});
}

/**
 * Detects dependencies modified by a parent reference, to conservatively prevent merging. When
 * implementing extensions like KHR_animation_pointer, the 'modifyChild' attribute should be added
 * to graph edges connecting the animation channel to the animated target property.
 *
 * NOTICE: Implementation is conservative, and could prevent merging two materials sharing the
 * same animated "Clearcoat" ExtensionProperty. While that scenario is possible for an in-memory
 * glTF Transform graph, valid glTF input files do not have that risk.
 */
function hasModifier(prop: Property, cache: Map<Property, boolean>): boolean {
	if (cache.has(prop)) return cache.get(prop)!;

	const graph = prop.getGraph();
	const visitedNodes = new Set<Property>();
	const edgeQueue = graph.listParentEdges(prop);

	// Search dependency subtree for 'modifyChild' attribute.
	while (edgeQueue.length > 0) {
		const edge = edgeQueue.pop()!;
		if (edge.getAttributes().modifyChild === true) {
			cache.set(prop, true);
			return true;
		}

		const child = edge.getChild();
		if (visitedNodes.has(child)) continue;

		for (const childEdge of graph.listChildEdges(child)) {
			edgeQueue.push(childEdge);
		}
	}

	cache.set(prop, false);
	return false;
}
