import { strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document } from '@gltf-transform/core';
import { unlit } from '@gltf-transform/functions';

describe('functions::unlit', () => {
	test('basic', async () => {
		const document = new Document();
		document.createMaterial();
		await document.transform(unlit());
		const unlitExtension = document.getRoot().listExtensionsUsed()[0];
		strictEqual(unlitExtension.extensionName, 'KHR_materials_unlit', 'adds extension');
	});
});
