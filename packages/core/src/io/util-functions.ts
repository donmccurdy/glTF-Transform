export function _dirname(path: string): string {
	const index = path.lastIndexOf('/');
	if (index === -1) return './';
	return path.substring(0, index + 1);
}

export function _resolve(base: string, path: string) {
	if (!_isRelative(path)) return path;

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

export function _isRelative(path: string): boolean {
	return !/^(?:[a-zA-Z]+:)?\//.test(path);
}
