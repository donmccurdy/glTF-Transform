import {
	Document,
	type Extension,
	type Graph,
	type Property,
	type PropertyResolver,
	PropertyType,
} from '@gltf-transform/core';

const { TEXTURE_INFO, ROOT } = PropertyType;
type PropertyConstructor = new (g: Graph<Property>) => Property;

const NO_TRANSFER_TYPES = new Set<string>([TEXTURE_INFO, ROOT]);

/**
 * Clones source {@link Document}, copying all properties and extensions within
 * it. Source document remains unchanged, and the two may be modified
 * independently after cloning.
 *
 * Example:
 *
 * ```javascript
 *	import { cloneDocument } from '@gltf-transform/functions';
 *
 *	const targetDocument = cloneDocument(sourceDocument);
 * ```
 */
export function cloneDocument(source: Document): Document {
	const target = new Document().setLogger(source.getLogger());
	const resolve = createDefaultPropertyResolver(target, source);
	mergeDocuments(target, source, resolve);

	// Root properties (name, asset, default scene, extras) are not overwritten by
	// mergeDocuments(), and should be explicitly copied when cloning.
	// biome-ignore lint/suspicious/noExplicitAny: TODO
	target.getRoot().copy(source.getRoot(), resolve as any);

	return target;
}

/**
 * Merges contents of source {@link Document} into target Document, without
 * modifying the source. Any extensions missing from the target will be added
 * {@link Scene Scenes} and {@link Buffer Buffers} are not combined —
 * the target Document may contain multiple Scenes and Buffers after this
 * operation. These may be cleaned up manually (see {@link unpartition}),
 * or document contents may be merged more granularly using
 * {@link copyToDocument}.
 *
 * Example:
 *
 * ```javascript
 *	import { mergeDocuments, unpartition } from '@gltf-transform/functions';
 *
 *	// Merge contents of sourceDocument into targetDocument.
 *	mergeDocuments(targetDocument, sourceDocument);
 *
 *	// (Optional) Remove all but one Buffer from the target Document.
 *	await targetDocument.transform(unpartition());
 * ```
 *
 * To merge several Scenes into one:
 *
 * ```javascript
 * import { mergeDocuments } from '@gltf-transform/functions';
 *
 * const map = mergeDocuments(targetDocument, sourceDocument);
 *
 * // Find original Scene.
 * const sceneA = targetDocument.getRoot().listScenes()[0];
 *
 * // Find counterpart of the source Scene in the target Document.
 * const sceneB = map.get(sourceDocument.getRoot().listScenes()[0]);
 *
 * // Create a Node, and append source Scene's direct children.
 * const rootNode = targetDocument.createNode()
 *		.setName('SceneB')
 *		.setPosition([10, 0, 0]);
 * for (const node of sceneB.listChildren()) {
 *		rootNode.addChild(node);
 * }
 *
 * // Append Node to original Scene, and dispose the empty Scene.
 * sceneA.addChild(rootNode);
 * sceneB.dispose();
 * ```
 */
export function mergeDocuments(
	target: Document,
	source: Document,
	resolve?: PropertyResolver<Property>,
): Map<Property, Property> {
	resolve ||= createDefaultPropertyResolver(target, source);

	for (const sourceExtension of source.getRoot().listExtensionsUsed()) {
		const targetExtension = target.createExtension(sourceExtension.constructor as new (doc: Document) => Extension);
		if (sourceExtension.isRequired()) targetExtension.setRequired(true);
	}

	// Root properties (name, asset, default scene, extras) are not overwritten.
	return _copyToDocument(target, source, listNonRootProperties(source), resolve);
}

/**
 * Moves the specified {@link Property Properties} from the source
 * {@link Document} to the target Document, and removes them from the source.
 * Dependencies of the source properties will be copied into the
 * target, but not removed from the source. Returns a Map from source
 * properties to their counterparts in the target Document.
 *
 * Example:
 *
 * ```javascript
 *	import { moveToDocument, prune } from '@gltf-transform/functions';
 *
 *	// Move all materials from sourceDocument to targetDocument.
 *	const map = moveToDocument(targetDocument, sourceDocument, sourceDocument.listMaterials());
 *
 *	// Find the new counterpart of `sourceMaterial` in the target Document.
 *	const targetMaterial = map.get(sourceMaterial);
 *
 *	// (Optional) Remove any resources (like Textures) that may now be unused
 *	// in the source Document after their parent Materials have been moved.
 *	await sourceDocument.transform(prune());
 * ```
 *
 * Moving a {@link Mesh}, {@link Animation}, or another resource depending on
 * a {@link Buffer} will create a copy of the source Buffer in the target
 * Document. If the target Document should contain only one Buffer, call
 * {@link unpartition} after moving properties.
 *
 * Repeated use of `moveToDocument` may create multiple copies of some
 * resources, particularly shared dependencies like {@link Texture Textures} or
 * {@link Accessor Accessors}. While duplicates can be cleaned up with
 * {@link dedup}, it is also possible to prevent duplicates by creating and
 * reusing the same resolver for all calls to `moveToDocument`:
 *
 * ```javascript
 *	import { moveToDocument, createDefaultPropertyResolver } from '@gltf-transform/functions';
 *
 *	const resolve = createDefaultPropertyResolver(targetDocument, sourceDocument);
 *
 *	// Move materials individually, without creating duplicates of shared textures.
 *	moveToDocument(targetDocument, sourceDocument, materialA, resolve);
 *	moveToDocument(targetDocument, sourceDocument, materialB, resolve);
 *	moveToDocument(targetDocument, sourceDocument, materialC, resolve);
 * ```
 *
 * If the transferred properties include {@link ExtensionProperty ExtensionProperties},
 * the associated {@link Extension Extensions} must be added to the target
 * Document first:
 *
 * ```javascript
 *	for (const sourceExtension of source.getRoot().listExtensionsUsed()) {
 *		const targetExtension = target.createExtension(sourceExtension.constructor);
 *		if (sourceExtension.isRequired()) targetExtension.setRequired(true);
 *	}
 * ```
 *
 * {@link Root} properties cannot be moved.
 *
 * {@link TextureInfo} properties cannot be given in the property list, but
 * are handled automatically when moving a {@link Material}.
 *
 * To copy properties without removing them from the source Document, see
 * {@link copyToDocument}.
 *
 * @experimental
 */
export function moveToDocument(
	target: Document,
	source: Document,
	sourceProperties: Property[],
	resolve?: PropertyResolver<Property>,
): Map<Property, Property> {
	const targetProperties = copyToDocument(target, source, sourceProperties, resolve);

	for (const property of sourceProperties) {
		property.dispose();
	}

	return targetProperties;
}

/**
 * Copies the specified {@link Property Properties} from the source
 * {@link Document} to the target Document, leaving originals in the source.
 * Dependencies of the source properties will also be copied into the
 * target. Returns a Map from source properties to their counterparts in the
 * target Document.
 *
 * Example:
 *
 * ```javascript
 *	import { copyToDocument } from '@gltf-transform/functions';
 *
 *	// Copy all materials from sourceDocument to targetDocument.
 *	const map = copyToDocument(targetDocument, sourceDocument, sourceDocument.listMaterials());
 *
 *	// Find the new counterpart of `sourceMaterial` in the target Document.
 *	const targetMaterial = map.get(sourceMaterial);
 * ```
 *
 * Copying a {@link Mesh}, {@link Animation}, or another resource depending on
 * a {@link Buffer} will create a copy of the source Buffer in the target
 * Document. If the target Document should contain only one Buffer, call
 * {@link unpartition} after copying properties.
 *
 * Repeated use of `copyToDocument` may create multiple copies of some
 * resources, particularly shared dependencies like {@link Texture Textures} or
 * {@link Accessor Accessors}. While duplicates can be cleaned up with
 * {@link dedup}, it is also possible to prevent duplicates by creating and
 * reusing the same resolver for all calls to `copyToDocument`:
 *
 * ```javascript
 *	import { copyToDocument, createDefaultPropertyResolver } from '@gltf-transform/functions';
 *
 *	const resolve = createDefaultPropertyResolver(targetDocument, sourceDocument);
 *
 *	// Copy materials individually, without creating duplicates of shared textures.
 *	copyToDocument(targetDocument, sourceDocument, materialA, resolve);
 *	copyToDocument(targetDocument, sourceDocument, materialB, resolve);
 *	copyToDocument(targetDocument, sourceDocument, materialC, resolve);
 * ```
 *
 * If the transferred properties include {@link ExtensionProperty ExtensionProperties},
 * the associated {@link Extension Extensions} must be added to the target
 * Document first:
 *
 * ```javascript
 *	for (const sourceExtension of source.getRoot().listExtensionsUsed()) {
 *		const targetExtension = target.createExtension(sourceExtension.constructor);
 *		if (sourceExtension.isRequired()) targetExtension.setRequired(true);
 *	}
 * ```
 *
 * {@link Root} properties cannot be copied.
 *
 * {@link TextureInfo} properties cannot be given in the property list, but
 * are handled automatically when copying a {@link Material}.
 *
 * To move properties to the target Document without leaving copies behind in
 * the source Document, use {@link moveToDocument} or dispose the properties
 * after copying.
 *
 * @experimental
 */
export function copyToDocument(
	target: Document,
	source: Document,
	sourceProperties: Property[],
	resolve?: PropertyResolver<Property>,
): Map<Property, Property> {
	const sourcePropertyDependencies = new Set<Property>();
	for (const property of sourceProperties) {
		if (NO_TRANSFER_TYPES.has(property.propertyType)) {
			throw new Error(`Type "${property.propertyType}" cannot be transferred.`);
		}
		listPropertyDependencies(property, sourcePropertyDependencies);
	}
	return _copyToDocument(target, source, Array.from(sourcePropertyDependencies), resolve);
}

/** @internal */
function _copyToDocument(
	target: Document,
	source: Document,
	sourceProperties: Property[],
	resolve?: PropertyResolver<Property>,
): Map<Property, Property> {
	resolve ||= createDefaultPropertyResolver(target, source);

	// Create stub classes for every Property in other Document.
	const propertyMap = new Map<Property, Property>();
	for (const sourceProp of sourceProperties) {
		// TextureInfo copy handled by Material or ExtensionProperty.
		if (!propertyMap.has(sourceProp) && sourceProp.propertyType !== TEXTURE_INFO) {
			propertyMap.set(sourceProp, resolve(sourceProp));
		}
	}

	// Assemble relationships between Properties.
	for (const [sourceProp, targetProp] of propertyMap.entries()) {
		targetProp.copy(sourceProp, resolve);
	}

	return propertyMap;
}

/**
 * Creates a default `resolve` implementation. May be used when moving
 * properties between {@link Document Documents} with {@link mergeDocuments},
 * {@link copyToDocument}, and {@link moveToDocument}. When the same resolver
 * is passed to multiple invocations, these functions will reuse previously-
 * transferred resources.
 *
 * @experimental
 */
export function createDefaultPropertyResolver(target: Document, source: Document): PropertyResolver<Property> {
	const propertyMap = new Map<Property, Property>([[source.getRoot(), target.getRoot()]]);

	return (sourceProp: Property): Property => {
		// TextureInfo lifecycle is bound to a Material or ExtensionProperty.
		if (sourceProp.propertyType === TEXTURE_INFO) return sourceProp;

		let targetProp = propertyMap.get(sourceProp);
		if (!targetProp) {
			// Create stub class, defer copying properties.
			const PropertyClass = sourceProp.constructor as PropertyConstructor;
			targetProp = new PropertyClass(target.getGraph());
			propertyMap.set(sourceProp, targetProp);
		}

		return targetProp;
	};
}

/** @internal */
function listPropertyDependencies(parent: Property, visited: Set<Property>): Set<Property> {
	const graph = parent.getGraph();
	const queue: Property[] = [parent];

	let next: Property | undefined;
	while ((next = queue.pop())) {
		visited.add(next);
		for (const child of graph.listChildren(next)) {
			if (!visited.has(child)) {
				queue.push(child);
			}
		}
	}

	return visited;
}

/** @internal */
function listNonRootProperties(document: Document): Property[] {
	const visited = new Set<Property>();
	for (const edge of document.getGraph().listEdges()) {
		visited.add(edge.getChild());
	}
	return Array.from(visited);
}
