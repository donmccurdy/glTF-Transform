import { ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document } from '@gltf-transform/core';
import { meshopt } from '@gltf-transform/functions';
import { createTorusKnotPrimitive, logger } from '@gltf-transform/test-utils';
import { MeshoptEncoder } from 'meshoptimizer';

describe('functions::meshopt', () => {
	test('basic', async () => {
		const document = new Document().setLogger(logger);
		document.createMesh().addPrimitive(createTorusKnotPrimitive(document, { tubularSegments: 6 }));

		await document.transform(meshopt({ encoder: MeshoptEncoder }));

		ok(hasMeshopt(document), 'adds extension');
	});

	test('noop', async () => {
		const document = new Document().setLogger(logger);
		await document.transform(meshopt({ encoder: MeshoptEncoder }));

		strictEqual(hasMeshopt(document), false, 'skips extension if no accessors found');
	});
});

const hasMeshopt = (document: Document): boolean =>
	document
		.getRoot()
		.listExtensionsUsed()
		.some((ext) => ext.extensionName === 'EXT_meshopt_compression');
