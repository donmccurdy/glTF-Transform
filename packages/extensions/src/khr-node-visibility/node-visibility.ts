import { Extension, type ReaderContext, type WriterContext } from '@gltf-transform/core';
import { KHR_NODE_VISIBILITY } from '../constants.js';
import { Visibility } from './visibility.js';

interface VisibilityDef {
	visible?: boolean;
}

/**
 * [KHR_node_visibility](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_node_visibility/)
 * defines visibility of a {@link Node} and its descendants.
 *
 * Properties:
 * - {@link Visibility}
 *
 * ### Example
 *
 * ```typescript
 * import { KHRNodeVisibility, Visibility } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const visibilityExtension = document.createExtension(KHRNodeVisibility);
 *
 * // Create Visibility property.
 * const visibility = visibilityExtension.createVisibility().setVisible(false);
 *
 * // Assign to a Node.
 * node.setExtension('KHR_node_visibility', visibility);
 * ```
 *
 * @experimental KHR_node_visibility is not yet ratified by the Khronos Group.
 */
export class KHRNodeVisibility extends Extension {
	public static readonly EXTENSION_NAME: typeof KHR_NODE_VISIBILITY = KHR_NODE_VISIBILITY;
	public readonly extensionName: typeof KHR_NODE_VISIBILITY = KHR_NODE_VISIBILITY;

	/** Creates a new Visibility property for use on a {@link Node}. */
	public createVisibility(): Visibility {
		return new Visibility(this.document.getGraph());
	}

	/** @hidden */
	public read(context: ReaderContext): this {
		const jsonDoc = context.jsonDoc;
		const nodeDefs = jsonDoc.json.nodes || [];

		nodeDefs.forEach((nodeDef, nodeIndex) => {
			if (nodeDef.extensions && nodeDef.extensions[KHR_NODE_VISIBILITY]) {
				const visibility = this.createVisibility();
				context.nodes[nodeIndex].setExtension(KHR_NODE_VISIBILITY, visibility);
				const visibilityDef = nodeDef.extensions[KHR_NODE_VISIBILITY] as VisibilityDef;
				if (visibilityDef.visible !== undefined) {
					visibility.setVisible(visibilityDef.visible);
				}
			}
		});

		return this;
	}

	/** @hidden */
	public write(context: WriterContext): this {
		const jsonDoc = context.jsonDoc;

		for (const node of this.document.getRoot().listNodes()) {
			const visibility = node.getExtension<Visibility>(KHR_NODE_VISIBILITY);
			if (!visibility) continue;

			const nodeIndex = context.nodeIndexMap.get(node)!;
			const nodeDef = jsonDoc.json.nodes![nodeIndex];
			nodeDef.extensions = nodeDef.extensions || {};
			nodeDef.extensions[KHR_NODE_VISIBILITY] = { visible: visibility.getVisible() };
		}

		return this;
	}
}
