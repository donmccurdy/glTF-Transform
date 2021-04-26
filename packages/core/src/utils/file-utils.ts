/**
 * # FileUtils
 *
 * *Utility class for working with file systems and URI paths.*
 *
 * @category Utilities
 */
export class FileUtils {
	/** Extracts the basename from a path, e.g. "folder/model.glb" -> "model". */
	static basename(path: string): string {
		const fileName = path.split(/[\\/]/).pop()!;
		return fileName.substr(0, fileName.lastIndexOf('.'));
	}

	/** Extracts the extension from a path, e.g. "folder/model.glb" -> "glb". */
	static extension(path: string): string {
		if (path.indexOf('data:') !== 0) {
			return path.split(/[\\/]/).pop()!.split(/[.]/).pop()!;
		} else if (path.indexOf('data:image/png') === 0) {
			return 'png';
		} else if (path.indexOf('data:image/jpeg') === 0) {
			return 'jpeg';
		} else {
			return 'bin';
		}
	}
}
