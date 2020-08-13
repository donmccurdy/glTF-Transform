const fs = require('fs');
const path = require('path');
const test = require('tape');
const tmp = require('tmp');
const cli = require('../src/cli');
const {Document, NodeIO} = require('@gltf-transform/core');

tmp.setGracefulCleanup();

test('@gltf-transform/cli::copy', t => {
	const io = new NodeIO(fs, path);
	const input = tmp.tmpNameSync({postfix: '.glb'});
	const output = tmp.tmpNameSync({postfix: '.glb'});

	const doc = new Document();
	doc.createBuffer();
	doc.createAccessor().setArray(new Uint8Array([1, 2, 3]));
	doc.createMaterial('MyMaterial').setBaseColorFactor([1, 0, 0, 1]);
	io.writeGLB(input, doc);

	cli
		.exec(['copy', input, output])
		.then(() => {
			const doc2 = io.read(output);
			t.ok(doc2, 'roundtrip document');
			t.equal(doc2.getRoot().listMaterials()[0].getName(), 'MyMaterial', 'roundtrip material');
			t.end();
		});
});

test('@gltf-transform/cli::validate', t => {
	const io = new NodeIO(fs, path);
	const input = tmp.tmpNameSync({postfix: '.glb'});

	const doc = new Document();
	doc.createBuffer();
	doc.createAccessor().setArray(new Uint8Array([1, 2, 3]));
	doc.createMaterial('MyMaterial').setBaseColorFactor([1, 0, 0, 1]);
	io.writeGLB(input, doc);

	cli
		.exec(['validate', input], {silent: true})
		.then(() => t.end());
});

test('@gltf-transform/cli::inspect', t => {
	const io = new NodeIO(fs, path);
	const input = tmp.tmpNameSync({postfix: '.glb'});

	const doc = new Document();
	doc.createBuffer();
	doc.createAccessor().setArray(new Uint8Array([1, 2, 3]));
	doc.createMesh('MyMesh');
	doc.createMaterial('MyMaterial').setBaseColorFactor([1, 0, 0, 1]);
	doc.createScene('MyScene').addNode(doc.createNode('MyNode'));
	doc.createAnimation();
	io.writeGLB(input, doc);

	cli
		.exec(['inspect', input], {silent: true})
		.then(() => t.end());
});


test('@gltf-transform/cli::toktx', t => {
	const io = new NodeIO(fs, path);
	const input = tmp.tmpNameSync({postfix: '.glb'});
	const output = tmp.tmpNameSync({postfix: '.glb'});

	const doc = new Document();
	doc.createAccessor().setArray(new Uint8Array([1, 2, 3])).setBuffer(doc.createBuffer());
	io.writeGLB(input, doc);

	cli
		.exec(['etc1s', input, output], {silent: true})
		.then(() => t.end());
});
