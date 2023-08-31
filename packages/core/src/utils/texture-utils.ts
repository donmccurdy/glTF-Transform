import { Texture } from '../properties/index.js';

const SRGB_PATTERN = /color|emissive|diffuse/i;

/** @hidden */
export function getTextureColorSpace(texture: Texture): string | null {
	const graph = texture.getGraph();
	const edges = graph.listParentEdges(texture);
	const isSRGB = edges.some((edge) => {
		return edge.getAttributes().isColor || SRGB_PATTERN.test(edge.getName());
	});
	return isSRGB ? 'srgb' : null;
}
