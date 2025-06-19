import type { Texture } from '@gltf-transform/core';

const SRGB_PATTERN = /color|emissive|diffuse/i;

/**
 * Returns the color space (if any) implied by the {@link Material} slots to
 * which a texture is assigned, or null for non-color textures. If the texture
 * is not connected to any {@link Material}, this function will also return
 * null — any metadata in the image file will be ignored.
 *
 * Under current glTF specifications, only 'srgb' and non-color (null) textures
 * are used.
 *
 * Example:
 *
 * ```typescript
 * import { getTextureColorSpace } from '@gltf-transform/functions';
 *
 * const baseColorTexture = material.getBaseColorTexture();
 * const normalTexture = material.getNormalTexture();
 *
 * getTextureColorSpace(baseColorTexture); // → 'srgb'
 * getTextureColorSpace(normalTexture); // → null
 * ```
 */
export function getTextureColorSpace(texture: Texture): string | null {
	const graph = texture.getGraph();
	const edges = graph.listParentEdges(texture);
	const isSRGB = edges.some((edge) => {
		return edge.getAttributes().isColor || SRGB_PATTERN.test(edge.getName());
	});
	return isSRGB ? 'srgb' : null;
}
