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
		// https://stackoverflow.com/a/15270931/1314762
		return path.split(/[\\/]/).pop().split(/[.]/).shift();
	}

	/** Extracts the extension from a path, e.g. "folder/model.glb" -> "glb". */
	static extension(path: string): string {
		if (path.indexOf('data:') !== 0) {
			return path.split(/[\\/]/).pop().split(/[.]/).pop();
		} else if (path.indexOf('data:image/png') === 0) {
			return 'png';
		} else if (path.indexOf('data:image/jpeg') === 0) {
			return 'jpeg';
		} else {
			return 'bin';
		}
	}
}
