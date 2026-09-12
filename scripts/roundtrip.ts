import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import FULL_INDEX from '../../glTF-Sample-Models/2.0/model-index.json';

/**
 * Generates a copy of each sample model using `copy` and `optimize`. Copy
 * not apply any meaningful edits to the files, and is intended to be a
 * lossless round trip test. Optimize runs a number of other commands.
 *
 * Known problems:
 * - MorphPrimitivesTest (simplify)
 *     - Work around with --no-simplify. Attribute-aware simplification might solve.
 * - NormalTangentMirrorTest (simplify)
 *     - Work around with --no-simplify. Attribute-aware simplification might solve.
 * - NormalTangentTest
 *     - Work around with --no-simplify. Attribute-aware simplification might solve.
 * - TextureEncodingTest (webp conversion; non-issue)
 * - TextureLinearInterpolationTest (webp conversion; non-issue)
 */

/** Source directory, referencing glTF-Sample-Models. */
const SOURCE = path.resolve(import.meta.dirname, '../../glTF-Sample-Models/2.0/');
/** Output directory for generated roundtrip assets. */
const TARGET = path.resolve(import.meta.dirname, './out');
const VARIANT = 'glTF-Binary';
/** Assets to skip. */
const SKIPLIST = new Set<string>([]);
const INDEX = FULL_INDEX.filter((asset) => !SKIPLIST.has(asset.name));

execSync(`rm -r ${TARGET}/**`);

INDEX.forEach((asset, assetIndex: number) => {
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
