import fs from 'fs';
import path, { dirname } from 'path';
import test from 'ava';
import tmp from 'tmp';
import { Document, FileUtils, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { program, programReady } from '@gltf-transform/cli';
import draco3d from 'draco3dgltf';
import { MeshoptDecoder } from 'meshoptimizer';
import { fileURLToPath } from 'url';

tmp.setGracefulCleanup();

const __dirname = dirname(fileURLToPath(import.meta.url));

test('copy', async (t) => {
	await programReady;
	const io = new NodeIO();
	const input = tmp.tmpNameSync({ postfix: '.glb' });
	const output = tmp.tmpNameSync({ postfix: '.glb' });

	const document = new Document();
	document.createBuffer();
	document.createAccessor().setArray(new Uint8Array([1, 2, 3]));
	document.createMaterial('MyMaterial').setBaseColorFactor([1, 0, 0, 1]);
	await io.write(input, document);

	return program.exec(['copy', input, output]).then(async () => {
		const doc2 = await io.read(output);
		t.truthy(doc2, 'roundtrip document');
		t.is(doc2.getRoot().listMaterials()[0].getName(), 'MyMaterial', 'roundtrip material');
	});
});

test('meshopt', async (t) => {
	await programReady;
	await MeshoptDecoder.ready;
	const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
		'meshopt.decoder': MeshoptDecoder,
	});
	const input = path.join(__dirname, 'in', 'chr_knight.glb');
	const output = tmp.tmpNameSync({ postfix: '.glb' });

	return program.exec(['meshopt', input, output], { silent: true }).then(async () => {
		const doc2 = await io.read(output);
		t.truthy(doc2, 'meshopt succeeds');
	});
});

test('draco', async (t) => {
	await programReady;
	const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
		'draco3d.decoder': await draco3d.createDecoderModule(),
		'draco3d.encoder': await draco3d.createEncoderModule(),
	});
	const input = path.join(__dirname, 'in', 'chr_knight.glb');
	const output = tmp.tmpNameSync({ postfix: '.glb' });

	return program.exec(['draco', input, output], { silent: true }).then(async () => {
		const doc2 = await io.read(output);
		t.truthy(doc2, 'draco succeeds');
	});
});

test('optimize', async (t) => {
	await programReady;
	await MeshoptDecoder.ready;
	const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
		'meshopt.decoder': MeshoptDecoder,
	});
	const input = path.join(__dirname, 'in', 'chr_knight.glb');
	const output = tmp.tmpNameSync({ postfix: '.glb' });

	return program.exec(['optimize', input, output], { silent: true }).then(async () => {
		const doc2 = await io.read(output);
		t.truthy(doc2, 'optimize succeeds');
	});
});

test('validate', async (t) => {
	await programReady;
	const io = new NodeIO();
	const input = tmp.tmpNameSync({ postfix: '.glb' });

	const document = new Document();
	document.createBuffer();
	document.createAccessor().setArray(new Uint8Array([1, 2, 3]));
	document.createMaterial('MyMaterial').setBaseColorFactor([1, 0, 0, 1]);
	await io.write(input, document);

	await program.exec(['validate', input], { silent: true });
	t.pass();
});

test('inspect', async (t) => {
	await programReady;
	const io = new NodeIO();
	const input = tmp.tmpNameSync({ postfix: '.glb' });

	const document = new Document();
	document.createBuffer();
	document.createAccessor().setArray(new Uint8Array([1, 2, 3]));
	document.createMesh('MyMesh');
	document.createMaterial('MyMaterial').setBaseColorFactor([1, 0, 0, 1]);
	document.createScene('MyScene').addChild(document.createNode('MyNode'));
	document.createAnimation();
	await io.write(input, document);
	await runSilent(async () => program.exec(['inspect', input], { silent: true }));
	t.pass();
});

test('merge', async (t) => {
	await programReady;
	const io = new NodeIO();
	const inputA = tmp.tmpNameSync({ postfix: '.glb' });
	const inputB = tmp.tmpNameSync({ postfix: '.glb' });
	const inputC = tmp.tmpNameSync({ postfix: '.png' });
	const output = tmp.tmpNameSync({ postfix: '.glb' });

	const documentA = new Document();
	documentA.createScene('SceneA');
	const bufA = documentA.createBuffer('BufferA');
	documentA
		.createAccessor()
		.setArray(new Uint8Array([1, 2, 3]))
		.setBuffer(bufA);
	await io.write(inputA, documentA);

	const documentB = new Document();
	documentB.createScene('');
	const bufB = documentB.createBuffer('BufferB');
	documentB
		.createAccessor()
		.setArray(new Uint8Array([1, 2, 3]))
		.setBuffer(bufB);
	await io.write(inputB, documentB);

	fs.writeFileSync(inputC, Buffer.from([1, 2, 3, 4, 5]));

	await program
		// https://github.com/mattallty/Caporal.js/issues/195
		.exec(['merge', [inputA, inputB, inputC, output].join(',')], { silent: true });

	const document = await io.read(output);
	const root = document.getRoot();
	const sceneNames = root.listScenes().map((s) => s.getName());
	const texName = root.listTextures()[0].getName();
	t.deepEqual(sceneNames, ['SceneA', FileUtils.basename(inputB)], 'merge scenes');
	t.is(texName, FileUtils.basename(inputC), 'merge textures');
});

async function runSilent(fn: () => Promise<unknown>): Promise<void> {
	const _log = console.log;
	console.log = () => void {};
	try {
		await fn();
	} finally {
		console.log = _log;
	}
}
