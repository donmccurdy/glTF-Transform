require('source-map-support').install();

import fs from 'fs';
import test from 'tape';
import tmp from 'tmp';
import { Document, FileUtils, NodeIO } from '@gltf-transform/core';
import { program, programReady } from '../';

tmp.setGracefulCleanup();

test('@gltf-transform/cli::copy', async (t) => {
	await programReady;
	const io = new NodeIO();
	const input = tmp.tmpNameSync({ postfix: '.glb' });
	const output = tmp.tmpNameSync({ postfix: '.glb' });

	const doc = new Document();
	doc.createBuffer();
	doc.createAccessor().setArray(new Uint8Array([1, 2, 3]));
	doc.createMaterial('MyMaterial').setBaseColorFactor([1, 0, 0, 1]);
	await io.write(input, doc);

	return program.exec(['copy', input, output]).then(async () => {
		const doc2 = await io.read(output);
		t.ok(doc2, 'roundtrip document');
		t.equal(doc2.getRoot().listMaterials()[0].getName(), 'MyMaterial', 'roundtrip material');
	});
});

test('@gltf-transform/cli::validate', async (_t) => {
	await programReady;
	const io = new NodeIO();
	const input = tmp.tmpNameSync({ postfix: '.glb' });

	const doc = new Document();
	doc.createBuffer();
	doc.createAccessor().setArray(new Uint8Array([1, 2, 3]));
	doc.createMaterial('MyMaterial').setBaseColorFactor([1, 0, 0, 1]);
	await io.write(input, doc);

	return program.exec(['validate', input], { silent: true });
});

test('@gltf-transform/cli::inspect', async (_t) => {
	await programReady;
	const io = new NodeIO();
	const input = tmp.tmpNameSync({ postfix: '.glb' });

	const doc = new Document();
	doc.createBuffer();
	doc.createAccessor().setArray(new Uint8Array([1, 2, 3]));
	doc.createMesh('MyMesh');
	doc.createMaterial('MyMaterial').setBaseColorFactor([1, 0, 0, 1]);
	doc.createScene('MyScene').addChild(doc.createNode('MyNode'));
	doc.createAnimation();
	await io.write(input, doc);

	return program.exec(['inspect', input], { silent: true });
});

test('@gltf-transform/cli::merge', async (t) => {
	await programReady;
	const io = new NodeIO();
	const inputA = tmp.tmpNameSync({ postfix: '.glb' });
	const inputB = tmp.tmpNameSync({ postfix: '.glb' });
	const inputC = tmp.tmpNameSync({ postfix: '.png' });
	const output = tmp.tmpNameSync({ postfix: '.glb' });

	const docA = new Document();
	docA.createScene('SceneA');
	const bufA = docA.createBuffer('BufferA');
	docA.createAccessor()
		.setArray(new Uint8Array([1, 2, 3]))
		.setBuffer(bufA);
	await io.write(inputA, docA);

	const docB = new Document();
	docB.createScene('');
	const bufB = docB.createBuffer('BufferB');
	docB.createAccessor()
		.setArray(new Uint8Array([1, 2, 3]))
		.setBuffer(bufB);
	await io.write(inputB, docB);

	fs.writeFileSync(inputC, Buffer.from([1, 2, 3, 4, 5]));

	await program
		// https://github.com/mattallty/Caporal.js/issues/195
		.exec(['merge', [inputA, inputB, inputC, output].join(',')], { silent: true });

	const doc = await io.read(output);
	const root = doc.getRoot();
	const sceneNames = root.listScenes().map((s) => s.getName());
	const texName = root.listTextures()[0].getName();
	t.deepEquals(sceneNames, ['SceneA', FileUtils.basename(inputB)], 'merge scenes');
	t.equals(texName, FileUtils.basename(inputC), 'merge textures');
	t.end();
});
