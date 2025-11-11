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
		PropertyType.ANIMATION_SAMPLER,
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
		const root = document.getRoot();
		const logger = document.getLogger();

		const cache = new Map<Property, number>();

		// console.time('ACCESSOR');
		if (propertyTypes.has(PropertyType.ACCESSOR)) {
			const accessorSkip = new Set(['name', 'buffer']);
			const accessorsByUsage = listAccessorsByUsage(document);
			let accessorDuplicates = dedupProperties(Array.from(accessorsByUsage.attribute), accessorSkip, cache);
			accessorDuplicates += dedupProperties(Array.from(accessorsByUsage.indices), accessorSkip, cache);
			accessorDuplicates += dedupProperties(Array.from(accessorsByUsage.input), accessorSkip, cache);
			accessorDuplicates += dedupProperties(Array.from(accessorsByUsage.output), accessorSkip, cache);
			logger.debug(`${NAME}: Removed ${accessorDuplicates} duplicate accessors.`);
		}
		// console.timeEnd('ACCESSOR');

		if (propertyTypes.has(PropertyType.ANIMATION_SAMPLER)) {
			const samplerSkip = new Set<string>(['name']);
			const samplers = new Set(root.listAnimations().flatMap((a) => a.listSamplers()));
			const samplerDuplicates = dedupProperties(Array.from(samplers), samplerSkip, cache);
			logger.debug(`${NAME}: Removed ${samplerDuplicates} duplicate animation samplers.`);
		}

		// console.time('TEXTURE');
		if (propertyTypes.has(PropertyType.TEXTURE)) {
			const textureSkip = new Set(options.keepUniqueNames ? ['uri'] : ['uri', 'name']);
			const textureDuplicates = dedupProperties(root.listTextures(), textureSkip, cache);
			logger.debug(`${NAME}: Removed ${textureDuplicates} duplicate textures.`);
		}
		// console.timeEnd('TEXTURE');

		// console.time('MATERIAL');
		if (propertyTypes.has(PropertyType.MATERIAL)) {
			const materialSkip = new Set(options.keepUniqueNames ? [] : ['name']);
			const materialModifierCache = new Map<Material, boolean>();
			const materials = root.listMaterials().filter((m) => !hasModifier(m, materialModifierCache));
			const materialDuplicates = dedupProperties(materials, materialSkip, cache);
			logger.debug(`${NAME}: Removed ${materialDuplicates} duplicate materials.`);
		}
		// console.timeEnd('MATERIAL');

		// console.time('MESH');
		if (propertyTypes.has(PropertyType.MESH)) {
			const meshSkip = new Set(options.keepUniqueNames ? [] : ['name']);
			const meshDuplicates = dedupProperties(root.listMeshes(), meshSkip, cache);
			logger.debug(`${NAME}: Removed ${meshDuplicates} duplicate meshes.`);
		}
		// console.timeEnd('MESH');

		// console.time('SKIN');
		if (propertyTypes.has(PropertyType.SKIN)) dedupSkins(document, cache, options);
		// console.timeEnd('SKIN');

		logger.debug(`${NAME}: Complete.`);
	});
}

function dedupProperties<T extends Property>(
	srcProperties: T[],
	skip: Set<string>,
	cache: Map<Property, number>,
): number {
	const dstProperties = new Map<number, T>();
	const duplicates = new Set<T>();

	for (const src of srcProperties) {
		const hash = src.toHash(skip, cache);
		const dst = dstProperties.get(hash);

		if (!dst) {
			dstProperties.set(hash, src);
			continue;
		}

		for (const parent of src.listParents()) {
			if (parent.propertyType !== PropertyType.ROOT) {
				parent.swap(src, dst);
			}
		}

		duplicates.add(src);
	}

	for (const duplicate of duplicates) {
		duplicate.dispose();
	}
	return duplicates.size;
}

// TODO: Use toHash(). What's with the deep equality thing?
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

/** Similar to {@link BufferViewUsage} but specific to dedup's local needs. */
type AccessorUsage = 'attribute' | 'indices' | 'input' | 'output';

/** Returns a list of Accessors, grouped by usage as needed for deduplication. */
function listAccessorsByUsage(document: Document): Record<AccessorUsage, Set<Accessor>> {
	const usage: Record<AccessorUsage, Set<Accessor>> = {
		attribute: new Set(),
		indices: new Set(),
		input: new Set(),
		output: new Set(),
	};

	for (const mesh of document.getRoot().listMeshes()) {
		for (const prim of mesh.listPrimitives()) {
			if (prim.getIndices()) usage.indices.add(prim.getIndices()!);
			for (const attribute of deepListAttributes(prim)) {
				usage.attribute.add(attribute);
			}
		}
	}

	for (const animation of document.getRoot().listAnimations()) {
		for (const sampler of animation.listSamplers()) {
			if (sampler.getInput()) usage.input.add(sampler.getInput()!);
			if (sampler.getOutput()) usage.output.add(sampler.getOutput()!);
		}
	}

	return usage;
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
