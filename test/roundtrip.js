const path = require('path');
const {execSync} = require('child_process');
const {SOURCE, TARGET, VARIANTS} = require('./constants.js');

/**
 * Generates a copy of each sample model using `gltf-transform copy`. Does
 * not apply any meaningful edits to the files: this is intended to be a
 * lossless round trip test.
 */

const INDEX = require(path.join(TARGET, 'model-index.json'))

INDEX.forEach((asset, assetIndex) => {

	console.info(`📦 ${asset.name} (${assetIndex + 1} / ${INDEX.length})`);

	Object.entries(asset.variants).forEach(([variant, filename]) => {
		if (!VARIANTS.has(variant)) return;

		const src = path.join(SOURCE, asset.name, variant, filename);
		const dst = path.join(TARGET, asset.name, variant, filename.replace(/\.(gltf|glb)$/, '.{v}.glb'));

		try {
			execSync(`gltf-transform copy ${src} ${dst.replace('{v}', 'copy')}`);
			execSync(`gltf-transform quantize ${src} ${dst.replace('{v}', 'quantize-lo')} --quantizePosition 14 --quantizeTexcoord 12 --quantizeColor 8 --quantizeNormal 8`);
			execSync(`gltf-transform quantize ${src} ${dst.replace('{v}', 'quantize-hi')}`);
			execSync(`gltf-transform draco ${src} ${dst.replace('{v}', 'draco')}`);
			console.info(`    - ✅ ${variant}/${filename}`);
		} catch (e) {
			console.error(`    - ⛔️ ${variant}/${filename}: ${e.message}`);
		}
	});

	console.log('\n');
});

console.info('🍻  Done.');
