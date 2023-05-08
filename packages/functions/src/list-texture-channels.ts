import { Document, Texture } from '@gltf-transform/core';
import { Material, TextureChannel, PropertyType } from '@gltf-transform/core';

/**
 * Returns a list of {@link TextureChannel TextureChannels} used by the given
 * texture. Determination is based only on the _role_ of the textures, e.g.
 * a texture used for the `occlusionTexture` will have (at least) a red channel
 * in use. See {@link getTextureChannelMask} for bitmask alternative.
 *
 * Example:
 *
 * ```js
 * const channels = listTextureChannels(texture);
 * if (channels.includes(TextureChannel.R)) {
 *   console.log('texture red channel used');
 * }
 * ```
 */
export function listTextureChannels(texture: Texture): TextureChannel[] {
	const mask = getTextureChannelMask(texture);
	const channels = [];
	if (mask & TextureChannel.R) channels.push(TextureChannel.R);
	if (mask & TextureChannel.G) channels.push(TextureChannel.G);
	if (mask & TextureChannel.B) channels.push(TextureChannel.B);
	if (mask & TextureChannel.A) channels.push(TextureChannel.A);
	return channels;
}

/**
 * Returns bitmask of all {@link TextureChannel TextureChannels} used by the
 * given texture. Determination is based only on the _role_ of the textures, e.g.
 * a texture used for the `occlusionTexture` will have (at least) a red channel.
 * See {@link listTextureChannels} for an array alternative.
 *
 * Example:
 *
 * ```js
 * const mask = getTextureChannelMask(texture);
 * if (mask & TextureChannel.R) {
 *   console.log('texture red channel used');
 * }
 * ```
 */
export function getTextureChannelMask(texture: Texture): number {
	const document = Document.fromGraph(texture.getGraph())!;
	let mask = 0x0000;
	for (const edge of document.getGraph().listParentEdges(texture)) {
		const parent = edge.getParent();
		let { channels } = edge.getAttributes() as { channels: number | undefined };

		if (
			channels &&
			edge.getName() === 'baseColorTexture' &&
			parent instanceof Material &&
			parent.getAlphaMode() === Material.AlphaMode.OPAQUE
		) {
			channels &= ~TextureChannel.A;
		}

		if (channels) {
			mask |= channels;
			continue;
		}

		if (parent.propertyType !== PropertyType.ROOT) {
			document.getLogger().warn(`Missing attribute ".channels" on edge, "${edge.getName()}".`);
		}
	}
	return mask;
}
