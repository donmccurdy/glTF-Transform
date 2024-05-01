import { Document, Node, PropertyType, Transform } from '@gltf-transform/core';
import { clearNodeParent } from './clear-node-parent.js';
import { prune } from './prune.js';
import { assignDefaults, createTransform } from './utils.js';

const NAME = 'flatten';

/** Options for the {@link flatten} function. */
export interface FlattenOptions {
	/**
	 * Whether to perform cleanup steps after completing the operation. Recommended, and enabled by
	 * default. Cleanup removes temporary resources created during the operation, but may also remove
	 * pre-existing unused or duplicate resources in the {@link Document}. Applications that require
	 * keeping these resources may need to disable cleanup, instead calling {@link dedup} and
	 * {@link prune} manually (with customized options) later in the processing pipeline.
	 * @experimental
	 */
	cleanup?: boolean;
}

export const FLATTEN_DEFAULTS: Required<FlattenOptions> = {
	cleanup: true,
};

/**
 * Flattens the scene graph, leaving {@link Node Nodes} with
 * {@link Mesh Meshes}, {@link Camera Cameras}, and other attachments
 * as direct children of the {@link Scene}. Skeletons and their
 * descendants are left in their original Node structure.
 *
 * {@link Animation} targeting a Node or its parents will
 * prevent that Node from being moved.
 *
 * Example:
 *
 * ```ts
 * import { flatten } from '@gltf-transform/functions';
 *
 * await document.transform(flatten());
 * ```
 *
 * @category Transforms
 */
export function flatten(_options: FlattenOptions = FLATTEN_DEFAULTS): Transform {
	const options = assignDefaults(FLATTEN_DEFAULTS, _options);

	return createTransform(NAME, async (document: Document): Promise<void> => {
		const root = document.getRoot();
		const logger = document.getLogger();

		// (1) Mark joints.
		const joints = new Set<Node>();
		for (const skin of root.listSkins()) {
			for (const joint of skin.listJoints()) {
				joints.add(joint);
			}
		}

		// (2) Mark nodes with TRS animation.
		const animated = new Set<Node>();
		for (const animation of root.listAnimations()) {
			for (const channel of animation.listChannels()) {
				const node = channel.getTargetNode();
				if (node && channel.getTargetPath() !== 'weights') {
					animated.add(node);
				}
			}
		}

		// (3) Mark descendants of joints and animated nodes.
		const hasJointParent = new Set<Node>();
		const hasAnimatedParent = new Set<Node>();
		for (const scene of root.listScenes()) {
			scene.traverse((node) => {
				const parent = node.getParentNode();
				if (!parent) return;
				if (joints.has(parent) || hasJointParent.has(parent)) {
					hasJointParent.add(node);
				}
				if (animated.has(parent) || hasAnimatedParent.has(parent)) {
					hasAnimatedParent.add(node);
				}
			});
		}

		// (4) For each affected node, in top-down order, clear parents.
		for (const scene of root.listScenes()) {
			scene.traverse((node) => {
				if (animated.has(node)) return;
				if (hasJointParent.has(node)) return;
				if (hasAnimatedParent.has(node)) return;

				clearNodeParent(node);
			});
		}

		// TODO(feat): Transform animation channels, accounting for previously inherited transforms.
		if (animated.size) {
			logger.debug(`${NAME}: Flattening node hierarchies with TRS animation not yet supported.`);
		}

		// (5) Clean up leaf nodes.
		if (options.cleanup) {
			await document.transform(prune({ propertyTypes: [PropertyType.NODE], keepLeaves: false }));
		}

		logger.debug(`${NAME}: Complete.`);
	});
}
