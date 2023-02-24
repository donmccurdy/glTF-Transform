import type { Node, Scene } from '@gltf-transform/core';
import { listNodeScenes } from './list-node-scenes.js';

/** @deprecated Use {@link listNodeScenes} instead. */
export function getNodeScene(node: Node): Scene | null {
	return listNodeScenes(node)[0] || null;
}
