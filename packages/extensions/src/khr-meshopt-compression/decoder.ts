import type { GLTF } from '@gltf-transform/core';
import { EXT_MESHOPT_COMPRESSION, KHR_MESHOPT_COMPRESSION } from '../constants.js';
import type { MeshoptBufferExtension } from './constants.js';

/**
 * Returns true for a fallback buffer, else false.
 *
 *   - All references to the fallback buffer must come from bufferViews that
 *     have KHR_meshopt_compression or EXT_meshopt_compression specified.
 *   - No references to the fallback buffer may come from
 *     KHR_meshopt_compression or EXT_meshopt_compression extension JSON.
 */
export function isFallbackBuffer(bufferDef: GLTF.IBuffer): boolean {
	if (bufferDef.extensions && bufferDef.extensions[KHR_MESHOPT_COMPRESSION]) {
		const fallbackDef = bufferDef.extensions[KHR_MESHOPT_COMPRESSION] as MeshoptBufferExtension;
		return !!fallbackDef.fallback;
	}

	if (bufferDef.extensions && bufferDef.extensions[EXT_MESHOPT_COMPRESSION]) {
		const fallbackDef = bufferDef.extensions[EXT_MESHOPT_COMPRESSION] as MeshoptBufferExtension;
		return !!fallbackDef.fallback;
	}

	return false;
}
