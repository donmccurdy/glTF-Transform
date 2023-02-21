import { EXT_MESHOPT_COMPRESSION } from '../constants.js';
import type { GLTF } from '@gltf-transform/core';
import type { MeshoptBufferExtension } from './constants.js';

/**
 * Returns true for a fallback buffer, else false.
 *
 *   - All references to the fallback buffer must come from bufferViews that
 *     have a EXT_meshopt_compression extension specified.
 *   - No references to the fallback buffer may come from
 *     EXT_meshopt_compression extension JSON.
 */
export function isFallbackBuffer(bufferDef: GLTF.IBuffer): boolean {
	if (!bufferDef.extensions || !bufferDef.extensions[EXT_MESHOPT_COMPRESSION]) return false;
	const fallbackDef = bufferDef.extensions[EXT_MESHOPT_COMPRESSION] as MeshoptBufferExtension;
	return !!fallbackDef.fallback;
}
