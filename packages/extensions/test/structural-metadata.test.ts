import { glob } from 'node:fs/promises';
import { Document, type JSONDocument } from '@gltf-transform/core';
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

		const srcExtensionDef = snapshotExtensionDef(srcJSONDocument);
		const dstExtensionDef = snapshotExtensionDef(dstJSONDocument);

		t.deepEqual(dstExtensionDef, srcExtensionDef, inputBasename);
	}
});

test('clone', (t) => {
	const doc = new Document();
	doc.createExtension(EXTStructuralMetadata);

	t.true(cloneDocument(doc).hasExtension('EXT_structural_metadata'), 'copy EXTStructuralMetadata');
});

/**
 * A round-trip will change buffer view indices, so we need to compare buffer view contents.
 */
function snapshotExtensionDef(jsonDocument: JSONDocument) {
	// biome-ignore lint/suspicious/noExplicitAny: Internal types not accessible from test.
	const extensionDef = structuredClone(jsonDocument.json.extensions.EXT_structural_metadata) as any;

	for (const propertyTableDef of extensionDef.propertyTables || []) {
		for (const propertyName in propertyTableDef.properties) {
			const property = propertyTableDef.properties[propertyName];
			for (const key of ['values', 'arrayOffsets', 'stringOffsets']) {
				if (property[key] !== undefined) {
					const bufferViewIndex = property[key];
					const bufferViewDef = jsonDocument.json.bufferViews[bufferViewIndex]!;
					const buffer = jsonDocument.json.buffers[bufferViewDef.buffer]!;
					const resource = jsonDocument.resources[buffer.uri];
					property[key] = new Uint8Array(
						resource.buffer,
						resource.byteOffset + bufferViewDef.byteOffset,
						bufferViewDef.byteLength,
					);
				}
			}
		}
	}

	return extensionDef;
}
