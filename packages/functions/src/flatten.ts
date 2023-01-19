import { Document, Node, PropertyType, Transform } from '@gltf-transform/core';
import { clearNodeParent } from './clear-node-parent';
import { prune } from './prune';
import { createTransform } from './utils';

const NAME = 'flatten';

/** Options for the {@link flatten} function. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FlattenOptions {}

const FLATTEN_DEFAULTS: Required<FlattenOptions> = {};

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
 */
export function flatten(_options: FlattenOptions): Transform {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const options = { ...FLATTEN_DEFAULTS, ..._options } as Required<FlattenOptions>;

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

		// (2) Mark animated nodes.
		const animated = new Set<Node>();
		for (const animation of root.listAnimations()) {
			for (const channel of animation.listChannels()) {
				const node = channel.getTargetNode();
				if (node) {
					animated.add(node);
				}
			}
		}

		// (3) Mark descendants of joints and animated nodes.
		const hasJointParent = new Set<Node>();
		const hasAnimatedParent = new Set<Node>();
		for (const scene of root.listScenes()) {
			scene.traverse((node) => {
				const parent = node.getParent();
				if (!(parent instanceof Node)) return;
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

		// TODO(feat): For nodes with animation in their world transform, transform channels.
		// TODO(feat): (Optional) Merge meshes of sibling nodes.

		// (5) Clean up leaf nodes.
		await document.transform(prune({ propertyTypes: [PropertyType.NODE], keepLeaves: false }));

		logger.debug(`${NAME}: Complete.`);
	});
}
