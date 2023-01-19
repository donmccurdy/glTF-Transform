import { Document, Texture } from '@gltf-transform/core';

/**
 * Returns names of all texture slots using the given texture.
 *
 * Example:
 *
 * ```js
 * const slots = listTextureSlots(texture);
 * // → ['occlusionTexture', 'metallicRoughnesTexture']
 * ```
 */
export function listTextureSlots(texture: Texture): string[] {
	const document = Document.fromGraph(texture.getGraph())!;
	const root = document.getRoot();
	const slots = texture
		.getGraph()
		.listParentEdges(texture)
		.filter((edge) => edge.getParent() !== root)
		.map((edge) => edge.getName());
	return Array.from(new Set(slots));
}
