import test from 'ava';
import { Document, Logger } from '@gltf-transform/core';
import { sparse } from '@gltf-transform/functions';

test('basic', async (t) => {
	const document = new Document().setLogger(new Logger(Logger.Verbosity.SILENT));
	const denseAccessor = document.createAccessor().setArray(new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]));
	const sparseAccessor = document.createAccessor().setArray(new Float32Array([0, 0, 0, 0, 1, 0, 0, 0]));
	await document.transform(sparse());
	t.is(denseAccessor.getSparse(), false, 'denseAccessor.sparse = false');
	t.is(sparseAccessor.getSparse(), true, 'sparseAccessor.sparse = true');
});
