import { ExtensionProperty, Material, Property, Texture, TextureInfo } from '@gltf-transform/core';

/**
 * Lists all {@link TextureInfo} definitions associated with a given
 * {@link Texture}. May be used to determine which UV transforms
 * and texCoord indices are applied to the material, without explicitly
 * checking the material properties and extensions.
 *
 * Example:
 *
 * ```typescript
 * // Find TextureInfo instances associated with the texture.
 * const results = listTextureInfo(texture);
 *
 * // Find which UV sets (TEXCOORD_0, TEXCOORD_1, ...) are required.
 * const texCoords = results.map((info) => info.getTexCoord());
 * // → [0, 1]
 * ```
 */
export function listTextureInfo(texture: Texture): TextureInfo[] {
	const graph = texture.getGraph();
	const results = new Set<TextureInfo>();

	for (const textureEdge of graph.listParentEdges(texture)) {
		const parent = textureEdge.getParent();
		const name = textureEdge.getName() + 'Info';

		for (const edge of graph.listChildEdges(parent)) {
			const child = edge.getChild();
			if (child instanceof TextureInfo && edge.getName() === name) {
				results.add(child);
			}
		}
	}

	return Array.from(results);
}

/**
 * Lists all {@link TextureInfo} definitions associated with any {@link Texture}
 * on the given {@link Material}. May be used to determine which UV transforms
 * and texCoord indices are applied to the material, without explicitly
 * checking the material properties and extensions.
 *
 * Example:
 *
 * ```typescript
 * const results = listTextureInfoByMaterial(material);
 *
 * const texCoords = results.map((info) => info.getTexCoord());
 * // → [0, 1]
 * ```
 */
export function listTextureInfoByMaterial(material: Material): TextureInfo[] {
	const graph = material.getGraph();
	const visited = new Set<Property>();
	const results = new Set<TextureInfo>();

	function traverse(prop: Material | ExtensionProperty) {
		const textureInfoNames = new Set<string>();

		for (const edge of graph.listChildEdges(prop)) {
			if (edge.getChild() instanceof Texture) {
				textureInfoNames.add(edge.getName() + 'Info');
			}
		}

		for (const edge of graph.listChildEdges(prop)) {
			const child = edge.getChild();
			if (visited.has(child)) continue;
			visited.add(child);

			if (child instanceof TextureInfo && textureInfoNames.has(edge.getName())) {
				results.add(child);
			} else if (child instanceof ExtensionProperty) {
				traverse(child);
			}
		}
	}

	traverse(material);
	return Array.from(results);
}
