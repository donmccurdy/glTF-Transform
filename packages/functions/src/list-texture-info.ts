import { Texture, TextureInfo } from '@gltf-transform/core';

/**
 * Lists all {@link TextureInfo} definitions associated with a given {@link Texture}.
 *
 * Example:
 *
 * ```js
 * // Find TextureInfo instances associated with the texture.
 * const results = listTextureInfo(texture);
 *
 * // Find which UV sets (TEXCOORD_0, TEXCOORD_1, ...) are required.
 * const texCoords = results.map((info) => info.getTexCoord());
 * // → [0, 0, 1]
 * ```
 */
export function listTextureInfo(texture: Texture): TextureInfo[] {
	const graph = texture.getGraph();
	const results: TextureInfo[] = [];

	for (const textureEdge of graph.listParentEdges(texture)) {
		const parent = textureEdge.getParent();
		const name = textureEdge.getName() + 'Info';

		for (const edge of graph.listChildEdges(parent)) {
			const child = edge.getChild();
			if (child instanceof TextureInfo && edge.getName() === name) {
				results.push(child);
			}
		}
	}

	return results;
}
