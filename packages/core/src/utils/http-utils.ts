/** @internal */
export class HTTPUtils {
	static readonly DEFAULT_INIT: RequestInit = {};
	static readonly URL_REGEXP = /https?:\/\//;

	static isAbsoluteURL(path: string) {
		return this.URL_REGEXP.test(path);
	}

	static dirname(path: string): string {
		const index = path.lastIndexOf('/');
		if (index === -1) return './';
		return path.substring(0, index + 1);
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

	static isRelativePath(path: string): boolean {
		return !/^(?:[a-zA-Z]+:)?\//.test(path);
	}
}
