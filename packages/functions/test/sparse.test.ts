require('source-map-support').install();

import test from 'tape';
import { Document, Logger } from '@gltf-transform/core';
import { sparse } from '../';

test('@gltf-transform/functions::sparse', async (t) => {
	const document = new Document().setLogger(new Logger(Logger.Verbosity.SILENT));
	const denseAccessor = document.createAccessor().setArray(new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]));
	const sparseAccessor = document.createAccessor().setArray(new Float32Array([0, 0, 0, 0, 1, 0, 0, 0]));
	await document.transform(sparse());
	t.equals(denseAccessor.getSparse(), false, 'denseAccessor.sparse = false');
	t.equals(sparseAccessor.getSparse(), true, 'sparseAccessor.sparse = true');
	t.end();
});
