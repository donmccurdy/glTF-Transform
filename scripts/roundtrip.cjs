const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { SOURCE, TARGET, VARIANT, SKIPLIST } = require('./constants.cjs');

/**
 * Generates a copy of each sample model using `copy` and `optimize`. Copy
 * not apply any meaningful edits to the files, and is intended to be a
 * lossless round trip test. Optimize runs a number of other commands.
 */

const INDEX = require(path.join(SOURCE, 'model-index.json')).filter((asset) => !SKIPLIST.has(asset.name));

execSync(`rm -r ${TARGET}/**`);

INDEX.forEach((asset, assetIndex) => {
	console.info(`📦 ${asset.name} (${assetIndex + 1} / ${INDEX.length})`);

	Object.entries(asset.variants).forEach(([variant, filename]) => {
		if (variant !== VARIANT) {
			delete asset.variants[variant];
			return;
		}

		const src = path.join(SOURCE, asset.name, VARIANT, filename);
		const dst = path.join(TARGET, filename.replace(/\.(gltf|glb)$/, '.{v}.glb'));

		try {
			execSync(`cp ${src} ${dst.replace('{v}', '_')}`);
			execSync(`gltf-transform copy ${src} ${dst.replace('{v}', 'copy')}`);
			execSync(`gltf-transform optimize ${src} ${dst.replace('{v}', 'optimized')} --texture-compress webp`);
			console.info(`    - ✅ ${variant}/${filename}`);
		} catch (e) {
			console.error(`    - ⛔️ ${variant}/${filename}: ${e.message}`);
		}
	});

	console.log('\n');
});

fs.writeFileSync(`${TARGET}/model-index.json`, JSON.stringify(INDEX));

console.info('🍻  Done.');
