const fs = require('fs');
const path = require('path');
const test = require('tape');
const tmp = require('tmp');
const cli = require('../src/cli');
const {Document, NodeIO} = require('@gltf-transform/core');

tmp.setGracefulCleanup();

test('@gltf-transform/cli', t => {
	const io = new NodeIO(fs, path);
	const input = tmp.tmpNameSync({postfix: '.glb'});
	const output = tmp.tmpNameSync({postfix: '.glb'});

	const doc = new Document();
	doc.createBuffer();
	doc.createAccessor().setArray(new Uint8Array([1, 2, 3]));
	doc.createMaterial('MyMaterial').setBaseColorFactor([1, 0, 0, 1]);
	io.writeGLB(input, doc);

	cli
		.exec(['repack', input, output])
		.then(() => {
			const doc2 = io.readGLB(output);
			t.ok(doc2, 'roundtrip document');
			t.equal(doc2.getRoot().listMaterials()[0].getName(), 'MyMaterial', 'roundtrip material');
			t.end();
		});
});
