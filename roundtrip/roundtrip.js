const path = require('path');
const {execSync} = require('child_process');
const {SOURCE, TARGET, VARIANTS, INDEX} = require('./constants.js');

/**
 * Generates a copy of each sample model using `gltf-transform repack`. Does
 * not apply any meaningful edits to the files: this is intended to be a
 * lossless round trip test.
 */

INDEX.forEach((asset, assetIndex) => {

	console.info(`📦 ${asset.name} (${assetIndex + 1} / ${INDEX.length})`);

	Object.entries(asset.variants).forEach(([variant, filename]) => {
		if (!VARIANTS.has(variant)) return;

		const src = path.join(SOURCE, asset.name, variant, filename);
		const dst = path.join(TARGET, asset.name, variant, filename.replace(/\.(gltf|glb)$/, '.transformed.glb'));

		try {
			execSync(`gltf-transform repack ${src} ${dst}`);
			console.info(`    - ✅ ${variant}/${filename}`);
		} catch (e) {
			console.error(`    - ⛔️ ${variant}/${filename}`);
		}
	});

	console.log('\n');
});

console.info('🍻  Done.');
