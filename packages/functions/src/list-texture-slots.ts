import type { Document, Texture } from '@gltf-transform/core';

/**
 * Returns names of all texture slots using the given texture.
 *
 * Example:
 *
 * ```js
 * const slots = listTextureSlots(document, texture);
 * // → ['occlusionTexture', 'metallicRoughnesTexture']
 * ```
 */
export function listTextureSlots(doc: Document, texture: Texture): string[] {
	const root = doc.getRoot();
	const slots = doc
		.getGraph()
		.listParentEdges(texture)
		.filter((edge) => edge.getParent() !== root)
		.map((edge) => edge.getName());
	return Array.from(new Set(slots));
}
