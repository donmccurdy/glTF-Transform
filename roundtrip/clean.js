const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
const {SOURCE, TARGET, VARIANTS, INDEX} = require('./constants.js');

/**
 * Cleans the `out/` directory, then makes fresh copies of all supported sample
 * model files, in their original/unmodified forms.
 */

INDEX.forEach((asset) => {
	cleanDir(path.join(TARGET, asset.name));

	const unsupported = [];
	for (const variant in asset.variants) {
		if (!VARIANTS.has(variant)) unsupported.push(variant);
	}
	for (const variant of unsupported) delete asset.variants[variant];

	Object.entries(asset.variants).forEach(([variant, filename]) => {
		if (!VARIANTS.has(variant)) return;

		const src = path.join(SOURCE, asset.name, variant);
		const dst = path.join(TARGET, asset.name, variant);
		execSync(`cp -r ${src} ${dst}`);
	});
});

fs.writeFileSync(path.join(TARGET, 'model-index.json'), JSON.stringify(INDEX, null, 2));

function cleanDir(dir) {
	if (fs.existsSync(dir)) {
		const relPath = path.relative(TARGET, dir);
		const isSafe = relPath && !relPath.startsWith('..') && !path.isAbsolute(relPath);
		if (!isSafe) {
			throw new Error(`Path not safe: ${dir}`);
		}
		execSync(`rm -rf ${dir}`);
	}
	fs.mkdirSync(dir);
}
