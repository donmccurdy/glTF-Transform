import { Texture, getTextureColorSpace as _getTextureColorSpace } from '@gltf-transform/core';

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
	return _getTextureColorSpace(texture);
}
