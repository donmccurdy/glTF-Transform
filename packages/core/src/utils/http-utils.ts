import { FileUtils } from './file-utils.js';

// Need a placeholder domain to construct a URL from a relative path. We only
// access `url.pathname`, so the domain doesn't matter.
const NULL_DOMAIN = 'https://null.example';

/**
 * # HTTPUtils
 *
 * *Utility class for working with URLs.*
 *
 * @category Utilities
 */
export class HTTPUtils {
	static readonly DEFAULT_INIT: RequestInit = {};
	static readonly PROTOCOL_REGEXP = /^[a-zA-Z]+:\/\//;

	static dirname(path: string): string {
		const index = path.lastIndexOf('/');
		if (index === -1) return './';
		return path.substring(0, index + 1);
	}

	/**
	 * Extracts the basename from a URL, e.g. "folder/model.glb" -> "model".
	 * See: {@link FileUtils.basename}
	 */
	static basename(uri: string): string {
		return FileUtils.basename(new URL(uri, NULL_DOMAIN).pathname);
	}

	/**
	 * Extracts the extension from a URL, e.g. "folder/model.glb" -> "glb".
	 * See: {@link FileUtils.extension}
	 */
	static extension(uri: string): string {
		return FileUtils.extension(new URL(uri, NULL_DOMAIN).pathname);
	}

	static resolve(base: string, path: string) {
		if (!this.isRelativePath(path)) return path;

		const stack = base.split('/');
		const parts = path.split('/');
		stack.pop();
		for (let i = 0; i < parts.length; i++) {
			if (parts[i] === '.') continue;
			if (parts[i] === '..') {
				stack.pop();
			} else {
				stack.push(parts[i]);
			}
		}
		return stack.join('/');
	}

	/**
	 * Returns true for URLs containing a protocol, and false for both
	 * absolute and relative paths.
	 */
	static isAbsoluteURL(path: string) {
		return this.PROTOCOL_REGEXP.test(path);
	}

	/**
	 * Returns true for paths that are declared relative to some unknown base
	 * path. For example, "foo/bar/" is relative both "/foo/bar/" is not.
	 */
	static isRelativePath(path: string): boolean {
		return !/^(?:[a-zA-Z]+:)?\//.test(path);
	}
}
