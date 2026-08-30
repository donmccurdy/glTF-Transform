import { strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document } from '@gltf-transform/core';
import { sparse } from '@gltf-transform/functions';
import { logger } from '@gltf-transform/test-utils';

describe('functions::sparse', () => {
	test('basic', async () => {
		const document = new Document().setLogger(logger);
		const denseAccessor = document.createAccessor().setArray(new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]));
		const sparseAccessor = document.createAccessor().setArray(new Float32Array([0, 0, 0, 0, 1, 0, 0, 0]));
		await document.transform(sparse());
		strictEqual(denseAccessor.getSparse(), false, 'denseAccessor.sparse = false');
		strictEqual(sparseAccessor.getSparse(), true, 'sparseAccessor.sparse = true');
	});
});
