import { EXT_MESHOPT_COMPRESSION } from '../constants.js';
import { _MeshoptCompression } from '../khr-meshopt-compression/index.js';

/**
 * TODO
 */
export class EXTMeshoptCompression extends _MeshoptCompression {
	public readonly extensionName: typeof EXT_MESHOPT_COMPRESSION = EXT_MESHOPT_COMPRESSION;
	public static readonly EXTENSION_NAME: typeof EXT_MESHOPT_COMPRESSION = EXT_MESHOPT_COMPRESSION;
}
