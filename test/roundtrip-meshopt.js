const fs = require('fs');
const path = require('path');
const gzipSize = require('gzip-size');
const {execSync} = require('child_process');
const {SOURCE, TARGET, VARIANTS} = require('./constants.js');

/**
 * Generates a copy of each sample model using `gltf-transform copy`. Does
 * not apply any meaningful edits to the files: this is intended to be a
 * lossless round trip test.
 */

const INDEX = require(path.join(TARGET, 'model-index.json'))

// Compression stats.
const csv = fs.openSync(path.join(TARGET, 'stats.csv'), 'w');
fs.writeSync(csv, 'asset,base,copy,ref-c,ref-cc,c,cc,draco\n');

INDEX.forEach((asset, assetIndex) => {

	console.info(`📦 ${asset.name} (${assetIndex + 1} / ${INDEX.length})`);

	Object.entries(asset.variants).forEach(([variant, filename]) => {
		if (!VARIANTS.has(variant)) return;

		const src = path.join(SOURCE, asset.name, variant, filename);
		const dst = path.join(TARGET, asset.name, variant, filename.replace(/\.(gltf|glb)$/, '.{v}.glb'));
		const base = dst.replace('{v}', 'base');

		try {
			execSync(`gltfpack -i ${src} -o ${base} -noq`);
			execSync(`gltf-transform copy ${base} ${dst.replace('{v}', 'transformed')}`);
			execSync(`gltfpack -i ${base} -o ${dst.replace('{v}', 'ref-c')} -c`);
			execSync(`gltfpack -i ${base} -o ${dst.replace('{v}', 'ref-cc')} -cc`);
			execSync(`gltf-transform meshopt ${base} ${dst.replace('{v}', 'c')} --method quantize`);
			execSync(`gltf-transform meshopt ${base} ${dst.replace('{v}', 'cc')} --method filter`);
			execSync(`gltf-transform quantize ${base} ${dst.replace('{v}', 'quant-lo')} --quantizePosition 14 --quantizeTexcoord 12 --quantizeColor 8 --quantizeNormal 8`);
			execSync(`gltf-transform quantize ${base} ${dst.replace('{v}', 'quant-hi')}`);
			execSync(`gltf-transform draco ${base} ${dst.replace('{v}', 'draco')}`);

			const stats = [
				gzipSize.sync(fs.readFileSync(base)),
				gzipSize.sync(fs.readFileSync(dst.replace('{v}', 'transformed'))),
				gzipSize.sync(fs.readFileSync(dst.replace('{v}', 'ref-c'))),
				gzipSize.sync(fs.readFileSync(dst.replace('{v}', 'ref-cc'))),
				gzipSize.sync(fs.readFileSync(dst.replace('{v}', 'c'))),
				gzipSize.sync(fs.readFileSync(dst.replace('{v}', 'cc'))),
				gzipSize.sync(fs.readFileSync(dst.replace('{v}', 'draco'))),
			].join(',');
			fs.writeSync(csv, `${asset.name},${stats}\n`);

			console.info(`    - ✅ ${variant}/${filename}`);
		} catch (e) {
			console.error(`    - ⛔️ ${variant}/${filename}: ${e.message}`);
		}
	});

	console.log('\n');
});

fs.closeSync(csv);

console.info('🍻  Done.');
