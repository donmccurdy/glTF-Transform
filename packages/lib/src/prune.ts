import { AnimationChannel, Document, Graph, Property, PropertyType, Root, Transform } from '@gltf-transform/core';

const NAME = 'prune';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PruneOptions {}
const DEFAULT_OPTIONS: PruneOptions = {};

/**
 * Removes unused resources from a file, and may be helpful for cleaning up after other operations.
 */
export const prune = function (_options: PruneOptions = DEFAULT_OPTIONS): Transform {
	_options = {...DEFAULT_OPTIONS, ..._options};

	return (doc: Document): void =>  {
		const logger = doc.getLogger();
		const root = doc.getRoot();
		const graph = doc.getGraph();

		const disposed: Record<string, number> = {};

		// Prune top-down, so that low-level properties like accessors can be removed if the
		// properties referencing them are removed.

		root.listNodes().forEach(treeShake);
		root.listSkins().forEach(treeShake);
		root.listMeshes().forEach(treeShake);
		root.listCameras().forEach(treeShake);

		indirectTreeShake(graph, PropertyType.PRIMITIVE);
		indirectTreeShake(graph, PropertyType.PRIMITIVE_TARGET);

		// Pruning animations is a bit more complicated:
		// (1) Remove channels without target nodes.
		// (2) Remove animations without channels.
		// (3) Remove samplers orphaned in the process.
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

		root.listMaterials().forEach(treeShake);
		root.listTextures().forEach(treeShake);
		root.listAccessors().forEach(treeShake);
		root.listBuffers().forEach(treeShake);

		// TODO(bug): This process does not identify unused ExtensionProperty instances. That could
		// be a future enhancement, either tracking unlinked properties as if they were connected
		// to the Graph, or iterating over a property list provided by the Extension. Properties in
		// use by an Extension are correctly preserved, in the meantime.

		if (Object.keys(disposed).length) {
			const str = Object.keys(disposed).map((t) => `${t} (${disposed[t]})`).join(', ');
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
			const parents = prop.listParents()
				.filter((p) => !(p instanceof Root || p instanceof AnimationChannel));
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
			graph.getLinks()
				.map((link) => link.getParent())
				.filter((parent) => parent.propertyType === propertyType)
				.forEach(treeShake);
		}

		/** Records properties disposed by type. */
		function markDisposed(prop: Property): void {
			disposed[prop.propertyType] = disposed[prop.propertyType] || 0;
			disposed[prop.propertyType]++;
		}

	};

};
