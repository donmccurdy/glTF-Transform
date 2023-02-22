import { ImageUtils } from './image-utils.js';

/**
 * # FileUtils
 *
 * *Utility class for working with file systems and URI paths.*
 *
 * @category Utilities
 */
export class FileUtils {
	/**
	 * Extracts the basename from a file path, e.g. "folder/model.glb" -> "model".
	 * See: {@link HTTPUtils.basename}
	 */
	static basename(uri: string): string {
		const fileName = uri.split(/[\\/]/).pop()!;
		return fileName.substring(0, fileName.lastIndexOf('.'));
	}

	/**
	 * Extracts the extension from a file path, e.g. "folder/model.glb" -> "glb".
	 * See: {@link HTTPUtils.extension}
	 */
	static extension(uri: string): string {
		if (uri.startsWith('data:image/')) {
			const mimeType = uri.match(/data:(image\/\w+)/)![1];
			return ImageUtils.mimeTypeToExtension(mimeType);
		} else if (uri.startsWith('data:model/gltf+json')) {
			return 'gltf';
		} else if (uri.startsWith('data:model/gltf-binary')) {
			return 'glb';
		} else if (uri.startsWith('data:application/')) {
			return 'bin';
		}
		return uri.split(/[\\/]/).pop()!.split(/[.]/).pop()!;
	}
}
