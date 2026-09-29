import { ok, strictEqual } from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { builtinModules } from 'node:module';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

// Browser bundlers drop Node.js built-ins through package.json#browser, which matches an
// import specifier exactly: a key for 'fs' does not cover import('node:fs'). Every built-in
// the published build imports must therefore be listed there, spelled the same way.
describe('core::package', () => {
	test('browser field covers every Node.js built-in the build imports', async () => {
		const root = resolve(import.meta.dirname, '..');
		const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
		const browser: Record<string, unknown> = pkg.browser ?? {};

		for (const file of ['dist/index.js', 'dist/index.cjs']) {
			// Comments dropped first: JSDoc examples in the build mention 'node:fs/promises'.
			const code = (await readFile(resolve(root, file), 'utf8'))
				.replace(/\/\*[\s\S]*?\*\//g, '')
				.replace(/^\s*\/\/.*$/gm, '');
			const specifiers = [
				...code.matchAll(/\b(?:import|require)\(\s*["']([^"']+)["']\s*\)|\bfrom\s*["']([^"']+)["']/g),
			]
				.map((match) => match[1] ?? match[2])
				.filter((specifier) => specifier.startsWith('node:') || builtinModules.includes(specifier));

			// NodeIO imports built-ins, so finding none means this scan is broken, not that all is well.
			ok(specifiers.length > 0, `${file}: found no Node.js built-in imports to check`);
			for (const specifier of specifiers) {
				strictEqual(browser[specifier], false, `${file}: "${specifier}" is not mapped in package.json#browser`);
			}
		}
	});
});
