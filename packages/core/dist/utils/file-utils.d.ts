/**
 * # FileUtils
 *
 * *Utility class for working with file systems and URI paths.*
 *
 * @category Utilities
 */
export declare class FileUtils {
    /** Extracts the basename from a path, e.g. "folder/model.glb" -> "model". */
    static basename(path: string): string;
    /** Extracts the extension from a path, e.g. "folder/model.glb" -> "glb". */
    static extension(path: string): string;
}
