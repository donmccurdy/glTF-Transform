require('source-map-support').install();

import * as fs from 'fs';
import * as test from 'tape';
import * as tmp from 'tmp';
import { Document, FileUtils, NodeIO } from '@gltf-transform/core';
import { program } from '../';

tmp.setGracefulCleanup();

test('@gltf-transform/cli::copy', t => {
	const io = new NodeIO();
	const input = tmp.tmpNameSync({postfix: '.glb'});
	const output = tmp.tmpNameSync({postfix: '.glb'});

	const doc = new Document();
	doc.createBuffer();
	doc.createAccessor().setArray(new Uint8Array([1, 2, 3]));
	doc.createMaterial('MyMaterial').setBaseColorFactor([1, 0, 0, 1]);
	io.write(input, doc);

	program
		.exec(['copy', input, output])
		.then(() => {
			const doc2 = io.read(output);
			t.ok(doc2, 'roundtrip document');
			t.equal(doc2.getRoot().listMaterials()[0].getName(), 'MyMaterial', 'roundtrip material');
			t.end();
		});
});

test('@gltf-transform/cli::validate', t => {
	const io = new NodeIO();
	const input = tmp.tmpNameSync({postfix: '.glb'});

	const doc = new Document();
	doc.createBuffer();
	doc.createAccessor().setArray(new Uint8Array([1, 2, 3]));
	doc.createMaterial('MyMaterial').setBaseColorFactor([1, 0, 0, 1]);
	io.write(input, doc);

	program
		.exec(['validate', input], {silent: true})
		.then(() => t.end());
});

test('@gltf-transform/cli::inspect', t => {
	const io = new NodeIO();
	const input = tmp.tmpNameSync({postfix: '.glb'});

	const doc = new Document();
	doc.createBuffer();
	doc.createAccessor().setArray(new Uint8Array([1, 2, 3]));
	doc.createMesh('MyMesh');
	doc.createMaterial('MyMaterial').setBaseColorFactor([1, 0, 0, 1]);
	doc.createScene('MyScene').addChild(doc.createNode('MyNode'));
	doc.createAnimation();
	io.write(input, doc);

	program
		.exec(['inspect', input], {silent: true})
		.then(() => t.end());
});


test('@gltf-transform/cli::toktx', t => {
	const io = new NodeIO();
	const input = tmp.tmpNameSync({postfix: '.glb'});
	const output = tmp.tmpNameSync({postfix: '.glb'});

	const doc = new Document();
	doc.createAccessor().setArray(new Uint8Array([1, 2, 3])).setBuffer(doc.createBuffer());
	io.write(input, doc);

	program
		.exec(['etc1s', input, output], {silent: true})
		.then(() => t.end());
});

test('@gltf-transform/cli::merge', t => {
	const io = new NodeIO();
	const inputA = tmp.tmpNameSync({postfix: '.glb'});
	const inputB = tmp.tmpNameSync({postfix: '.glb'});
	const inputC = tmp.tmpNameSync({postfix: '.png'});
	const output = tmp.tmpNameSync({postfix: '.glb'});

	const docA = new Document();
	docA.createScene('SceneA');
	const bufA = docA.createBuffer('BufferA');
	docA.createAccessor().setArray(new Uint8Array([1, 2, 3])).setBuffer(bufA);
	io.write(inputA, docA);

	const docB = new Document();
	docB.createScene('SceneB');
	const bufB = docB.createBuffer('BufferB');
	docB.createAccessor().setArray(new Uint8Array([1, 2, 3])).setBuffer(bufB);
	io.write(inputB, docB);

	fs.writeFileSync(inputC, Buffer.from([1, 2, 3, 4, 5]));

	program
		// https://github.com/mattallty/Caporal.js/issues/195
		.exec(['merge', [inputA, inputB, inputC, output].join(',')], {silent: true})
		.then(() => {
			const doc = io.read(output);
			const sceneNames = doc.getRoot().listScenes().map((s) => s.getName());
			const texName = doc.getRoot().listTextures()[0].getName();
			t.deepEquals(sceneNames, ['SceneA', 'SceneB'], 'merge scenes');
			t.equals(texName, FileUtils.basename(inputC), 'merge textures');
			t.end();
		});
});
