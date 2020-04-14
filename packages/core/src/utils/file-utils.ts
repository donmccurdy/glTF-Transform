/** Utility class for working with file systems and URI paths. */
export class FileUtils {
	/** Extracts the basename from a path, e.g. "folder/model.glb" -> "model". */
	static basename(path: string): string {
		// https://stackoverflow.com/a/15270931/1314762
		return path.split(/[\\/]/).pop().split(/[.]/).shift();
	}

	/** Extracts the extension from a path, e.g. "folder/model.glb" -> "glb". */
	static extension(path: string): string {
		return path.split(/[\\/]/).pop().split(/[.]/).pop();
	}
}
