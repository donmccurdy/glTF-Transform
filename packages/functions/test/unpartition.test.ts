require('source-map-support').install();

import test from 'tape';
import { Document, Logger } from '@gltf-transform/core';
import { unpartition } from '../';

test('@gltf-transform/functions::unpartition', async (t) => {
	const document = new Document();
	const root = document.getRoot();
	const bufferA = document.createBuffer();
	const bufferB = document.createBuffer();
	const bufferC = document.createBuffer();
	const accessorA = document.createAccessor().setBuffer(bufferA);
	const accessorB = document.createAccessor().setBuffer(bufferB);
	const accessorC = document.createAccessor().setBuffer(bufferC);

	document.setLogger(new Logger(Logger.Verbosity.SILENT));

	await document.transform(unpartition());

	t.equal(root.listBuffers().length, 1, 'buffers.length === 1');
	t.notOk(bufferA.isDisposed(), 'buffersA live');
	t.ok(bufferB.isDisposed(), 'buffersB disposed');
	t.ok(bufferC.isDisposed(), 'buffersC disposed');
	t.equals(accessorA.getBuffer(), bufferA, 'accessorA → bufferA');
	t.equals(accessorB.getBuffer(), bufferA, 'accessorA → bufferA');
	t.equals(accessorC.getBuffer(), bufferA, 'accessorA → bufferA');
	t.end();
});
