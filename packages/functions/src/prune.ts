import {
	AnimationChannel,
	Document,
	Graph,
	Property,
	PropertyType,
	Root,
	Transform,
	Node,
	Scene,
} from '@gltf-transform/core';
import { createTransform } from './utils';

const NAME = 'prune';

export interface PruneOptions {
	/** List of {@link PropertyType} identifiers to be de-duplicated.*/
	propertyTypes?: string[];
	/** Whether to keep empty leaf nodes. */
	keepLeaves?: boolean;
}
const PRUNE_DEFAULTS: Required<PruneOptions> = {
	propertyTypes: [
		PropertyType.NODE,
		PropertyType.SKIN,
		PropertyType.MESH,
		PropertyType.CAMERA,
		PropertyType.PRIMITIVE,
		PropertyType.PRIMITIVE_TARGET,
		PropertyType.ANIMATION,
		PropertyType.MATERIAL,
		PropertyType.TEXTURE,
		PropertyType.ACCESSOR,
		PropertyType.BUFFER,
	],
	keepLeaves: false,
};

/**
 * Removes properties from the file if they are not referenced by a {@link Scene}. Commonly helpful
 * for cleaning up after other operations, e.g. allowing a node to be detached and any unused
 * meshes, materials, or other resources to be removed automatically.
 *
 * Example:
 *
 * ```
 * document.getRoot().listMaterials(); // → [Material, Material]
 *
 * await document.transform(prune());
 *
 * document.getRoot().listMaterials(); // → [Material]
 * ```
 *
 * No options are currently implemented for this function.
 */
export const prune = function (_options: PruneOptions = PRUNE_DEFAULTS): Transform {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const options = { ...PRUNE_DEFAULTS, ..._options } as Required<PruneOptions>;
	const propertyTypes = new Set(options.propertyTypes);

	return createTransform(NAME, (doc: Document): void => {
		const logger = doc.getLogger();
		const root = doc.getRoot();
		const graph = doc.getGraph();

		const disposed: Record<string, number> = {};

		// Prune top-down, so that low-level properties like accessors can be removed if the
		// properties referencing them are removed.

		if (propertyTypes.has(PropertyType.NODE) && !options.keepLeaves) root.listScenes().forEach(nodeTreeShake);
		if (propertyTypes.has(PropertyType.NODE)) root.listNodes().forEach(treeShake);
		if (propertyTypes.has(PropertyType.SKIN)) root.listSkins().forEach(treeShake);
		if (propertyTypes.has(PropertyType.MESH)) root.listMeshes().forEach(treeShake);
		if (propertyTypes.has(PropertyType.CAMERA)) root.listCameras().forEach(treeShake);

		if (propertyTypes.has(PropertyType.PRIMITIVE)) {
			indirectTreeShake(graph, PropertyType.PRIMITIVE);
		}
		if (propertyTypes.has(PropertyType.PRIMITIVE_TARGET)) {
			indirectTreeShake(graph, PropertyType.PRIMITIVE_TARGET);
		}

		// Pruning animations is a bit more complicated:
		// (1) Remove channels without target nodes.
		// (2) Remove animations without channels.
		// (3) Remove samplers orphaned in the process.
		if (propertyTypes.has(PropertyType.ANIMATION)) {
			for (const anim of root.listAnimations()) {
				for (const channel of anim.listChannels()) {
					if (!channel.getTargetNode()) {
						channel.dispose();
						markDisposed(channel);
					}
				}
				if (!anim.listChannels().length) {
					const samplers = anim.listSamplers();
					treeShake(anim);
					samplers.forEach(treeShake);
				} else {
					anim.listSamplers().forEach(treeShake);
				}
			}
		}

		if (propertyTypes.has(PropertyType.MATERIAL)) root.listMaterials().forEach(treeShake);
		if (propertyTypes.has(PropertyType.TEXTURE)) root.listTextures().forEach(treeShake);
		if (propertyTypes.has(PropertyType.ACCESSOR)) root.listAccessors().forEach(treeShake);
		if (propertyTypes.has(PropertyType.BUFFER)) root.listBuffers().forEach(treeShake);

		// TODO(bug): This process does not identify unused ExtensionProperty instances. That could
		// be a future enhancement, either tracking unlinked properties as if they were connected
		// to the Graph, or iterating over a property list provided by the Extension. Properties in
		// use by an Extension are correctly preserved, in the meantime.

		if (Object.keys(disposed).length) {
			const str = Object.keys(disposed)
				.map((t) => `${t} (${disposed[t]})`)
				.join(', ');
			logger.info(`${NAME}: Removed types... ${str}`);
		} else {
			logger.info(`${NAME}: No unused properties found.`);
		}

		logger.debug(`${NAME}: Complete.`);

		//

		/** Disposes of the given property if it is unused. */
		function treeShake(prop: Property): void {
			// Consider a property unused if it has no references from another property, excluding
			// types Root and AnimationChannel.
			const parents = prop.listParents().filter((p) => !(p instanceof Root || p instanceof AnimationChannel));
			if (!parents.length) {
				prop.dispose();
				markDisposed(prop);
			}
		}

		/**
		 * For property types the Root does not maintain references to, we'll need to search the
		 * graph. It's possible that objects may have been constructed without any outbound links,
		 * but since they're not on the graph they don't need to be tree-shaken.
		 */
		function indirectTreeShake(graph: Graph<Property>, propertyType: string): void {
			graph
				.listEdges()
				.map((edge) => edge.getParent())
				.filter((parent) => parent.propertyType === propertyType)
				.forEach(treeShake);
		}

		/** Iteratively prunes leaf Nodes without contents. */
		function nodeTreeShake(prop: Node | Scene): void {
			prop.listChildren().forEach(nodeTreeShake);

			if (prop instanceof Scene) return;

			const isUsed = graph.listParentEdges(prop).some((e) => {
				const ptype = e.getParent().propertyType;
				return ptype !== PropertyType.ROOT && ptype !== PropertyType.SCENE && ptype !== PropertyType.NODE;
			});
			const isEmpty = graph.listChildren(prop).length === 0;
			if (isEmpty && !isUsed) {
				prop.dispose();
				markDisposed(prop);
			}
		}

		/** Records properties disposed by type. */
		function markDisposed(prop: Property): void {
			disposed[prop.propertyType] = disposed[prop.propertyType] || 0;
			disposed[prop.propertyType]++;
		}
	});
};
