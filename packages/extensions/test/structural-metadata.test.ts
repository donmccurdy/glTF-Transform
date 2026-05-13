import { glob } from 'node:fs/promises';
import { Document } from '@gltf-transform/core';
import { EXTStructuralMetadata } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';
import { createPlatformIO } from '@gltf-transform/test-utils';
import test from 'ava';

import { basename, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('round trip', async (t) => {
	const io = (await createPlatformIO()).registerExtensions([EXTStructuralMetadata]);

	for await (const inputPath of glob(resolve(__dirname, 'in', 'EXT_structural_metadata', '*.gltf'))) {
		const inputBasename = basename(inputPath);

		const srcJSONDocument = await io.readAsJSON(inputPath);
		const dstJSONDocument = await io.writeJSON(await io.readJSON(srcJSONDocument));

		const srcExtensionDef = stripBufferViews(srcJSONDocument.json.extensions.EXT_structural_metadata);
		const dstExtensionDef = stripBufferViews(dstJSONDocument.json.extensions.EXT_structural_metadata);

		t.deepEqual(dstExtensionDef, srcExtensionDef, `${inputBasename} - root.extensions.EXT_structural_metadata`);
	}
});

test('clone', (t) => {
	const doc = new Document();
	doc.createExtension(EXTStructuralMetadata);

	t.true(cloneDocument(doc).hasExtension('EXT_structural_metadata'), 'copy EXTStructuralMetadata');
});

/**
 * A round-trip will change buffer view indices, and this test cannot yet compare
 * the contents of the buffers. Remove these indices from JSON, for now.
 */
// biome-ignore lint/suspicious/noExplicitAny: Internal types not accessible from test.
function stripBufferViews(extensionDef: any) {
	for (const propertyTableDef of extensionDef.propertyTables || []) {
		for (const propertyName in propertyTableDef.properties) {
			const property = propertyTableDef.properties[propertyName];
			delete property.values;
		}
	}
}
