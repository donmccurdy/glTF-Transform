import { strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document } from '@gltf-transform/core';
import { draco } from '@gltf-transform/functions';
import { logger } from '@gltf-transform/test-utils';

describe('functions::draco', () => {
	test('basic', async () => {
		const document = new Document().setLogger(logger);
		await document.transform(draco({ method: 'edgebreaker' }));
		await document.transform(draco({ method: 'sequential' }));
		const dracoExtension = document.getRoot().listExtensionsUsed()[0];
		strictEqual(dracoExtension.extensionName, 'KHR_draco_mesh_compression', 'adds extension');
	});
});
