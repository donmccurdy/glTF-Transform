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
		t.truthy(doc2, 'roundtrip document');
		t.is(doc2.getRoot().listMaterials()[0].getName(), 'MyMaterial', 'roundtrip material');
	});
});

test('@gltf-transform/cli::meshopt', async (t) => {
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

test('@gltf-transform/cli::draco', async (t) => {
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

test('@gltf-transform/cli::optimize', async (t) => {
	await programReady;
	const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
		'draco3d.decoder': await draco3d.createDecoderModule(),
		'draco3d.encoder': await draco3d.createEncoderModule(),
	});
	const input = path.join(__dirname, 'in', 'chr_knight.glb');
	const output = tmp.tmpNameSync({ postfix: '.glb' });

	return program.exec(['optimize', input, output], { silent: true }).then(async () => {
		const doc2 = await io.read(output);
		t.truthy(doc2, 'optimize succeeds');
	});
});

test('@gltf-transform/cli::validate', async (t) => {
	await programReady;
	const io = new NodeIO();
	const input = tmp.tmpNameSync({ postfix: '.glb' });

	const doc = new Document();
	doc.createBuffer();
	doc.createAccessor().setArray(new Uint8Array([1, 2, 3]));
	doc.createMaterial('MyMaterial').setBaseColorFactor([1, 0, 0, 1]);
	await io.write(input, doc);

	await program.exec(['validate', input], { silent: true });
	t.pass();
});

test('@gltf-transform/cli::inspect', async (t) => {
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
	await runSilent(async () => program.exec(['inspect', input], { silent: true }));
	t.pass();
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
