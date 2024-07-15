import test from 'ava';
import fs from 'fs';
import { BufferUtils, Document, Format, GLB_BUFFER, GLTF, JSONDocument } from '@gltf-transform/core';
import { createPlatformIO, resolve } from '@gltf-transform/test-utils';

test('common', async (t) => {
	const io = await createPlatformIO();
	await t.throwsAsync(
		() =>
			io.readJSON({
				json: { asset: { version: '1.0' } },
				resources: {},
			}),
		{ message: /Unsupported/i },
		'1.0',
	);
});

test('glb without optional buffer', async (t) => {
	const document = new Document();
	document.createScene().addChild(document.createNode('MyNode'));

	const io = await createPlatformIO();
	const json = await io.writeJSON(document, { format: Format.GLB });
	const binary = await io.writeBinary(document);

	t.truthy(json, 'writes json');
	t.truthy(binary, 'writes binary');
	t.is(Object.values(json.resources).length, 0, 'no buffers');
	t.truthy(await io.readJSON(json), 'reads json');
	t.truthy(await io.readBinary(binary), 'reads binary');
	t.deepEqual(
		(await io.readBinary(binary))
			.getRoot()
			.listNodes()
			.map((n) => n.getName()),
		['MyNode'],
		'same nodes',
	);
});

test('glb without required buffer', async (t) => {
	const io = await createPlatformIO();

	let document = new Document();
	document.createTexture('TexA').setImage(new Uint8Array(1)).setMimeType('image/png');
	document.createTexture('TexB').setImage(new Uint8Array(2)).setMimeType('image/png');

	await t.throwsAsync(
		() => io.writeJSON(document, { format: Format.GLB }),
		{ message: /buffer required/i },
		'writeJSON throws',
	);
	await t.throwsAsync(() => io.writeBinary(document), { message: /buffer required/i }, 'writeBinary throws');

	document.createBuffer();

	t.truthy(io.writeJSON(document, { format: Format.GLB }), 'writeJSON suceeds');
	t.truthy(io.writeBinary(document), 'writeBinary succeeds');

	document = new Document();
	document.createAccessor().setArray(new Float32Array(10));
	document.createAccessor().setArray(new Float32Array(20));

	await t.throwsAsync(
		() => io.writeJSON(document, { format: Format.GLB }),
		{ message: /buffer required/i },
		'writeJSON throws',
	);
	await t.throwsAsync(() => io.writeBinary(document), { message: /buffer required/i }, 'writeBinary throws');

	document.createBuffer();

	t.truthy(await io.writeJSON(document, { format: Format.GLB }), 'writeJSON suceeds');
	t.truthy(await io.writeBinary(document), 'writeBinary succeeds');
});

test('glb with texture-only buffer', async (t) => {
	const document = new Document();
	document.createTexture('TexA').setImage(new Uint8Array(1)).setMimeType('image/png');
	document.createTexture('TexB').setImage(new Uint8Array(2)).setMimeType('image/png');
	document.createBuffer();

	const io = await createPlatformIO();
	const json = await io.writeJSON(document, { format: Format.GLB });
	const binary = await io.writeBinary(document);

	t.truthy(json, 'writes json');
	t.truthy(binary, 'writes binary');
	t.is(Object.values(json.resources).length, 1, 'writes 1 buffer');

	const rtTextures = (await io.readBinary(binary)).getRoot().listTextures();

	t.is(rtTextures[0].getName(), 'TexA', 'reads texture 1');
	t.is(rtTextures[1].getName(), 'TexB', 'reads texture 1');
	t.deepEqual(rtTextures[0].getImage(), new Uint8Array(1), 'reads texture 1 data');
	t.deepEqual(rtTextures[1].getImage(), new Uint8Array(2), 'reads texture 2 data');
});

test('glb with data uri', async (t) => {
	const document = new Document();
	document.createTexture('TexA').setImage(new Uint8Array(1)).setMimeType('image/png');
	document.createTexture('TexB').setImage(new Uint8Array(2)).setMimeType('image/png');
	document.createBuffer();

	// (1) Write JSONDocument and replace resources with Data URIs.

	const io = await createPlatformIO();
	const { json, resources } = await io.writeJSON(document, { format: Format.GLB });
	for (const buffer of json.buffers!) {
		const uri = buffer.uri || GLB_BUFFER;
		const resource = resources[uri]!;
		buffer.uri = `data:text/plain;base64,` + Buffer.from(resource).toString('base64');
		delete resources[uri];
	}

	t.truthy(json, 'writes json');
	t.truthy(json.buffers[0].uri.startsWith('data:'), 'buffer contains data uri');
	t.is(Object.values(resources).length, 0, 'no external resources');

	// (2) Convert the JSONDocument to a GLB without a BIN chunk.

	const header = new Uint32Array([0x46546c67, 2, 12]);

	const jsonText = JSON.stringify(json);
	const jsonChunkData = BufferUtils.pad(BufferUtils.encodeText(jsonText), 0x20);
	const jsonChunkHeader = BufferUtils.toView(new Uint32Array([jsonChunkData.byteLength, 0x4e4f534a]));
	const jsonChunk = BufferUtils.concat([jsonChunkHeader, jsonChunkData]);
	header[header.length - 1] += jsonChunk.byteLength;

	const binary = BufferUtils.concat([BufferUtils.toView(header), jsonChunk]);

	t.truthy(binary, 'writes binary');

	// (3) Test that we can read GLBs with Data URIs.

	const rtTextures = (await io.readBinary(binary)).getRoot().listTextures();

	t.is(rtTextures[0].getName(), 'TexA', 'reads texture 1');
	t.is(rtTextures[1].getName(), 'TexB', 'reads texture 1');
	t.deepEqual(Array.from(rtTextures[0].getImage()), Array.from(new Uint8Array(1)), 'reads texture 1 data');
	t.deepEqual(Array.from(rtTextures[1].getImage()), Array.from(new Uint8Array(2)), 'reads texture 2 data');
});

test('gltf embedded', async (t) => {
	const io = await createPlatformIO();
	const jsonPath = resolve('../in/Box_glTF-Embedded/Box.gltf', import.meta.url);
	const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
	const json = JSON.parse(jsonContent);
	const jsonDoc = { json, resources: {} } as JSONDocument;
	const jsonDocCopy = JSON.parse(JSON.stringify(jsonDoc));

	t.truthy(await io.readJSON(jsonDoc), 'reads document');
	t.deepEqual(jsonDoc, jsonDocCopy, 'original unchanged');
});

test('glb with unknown chunk', async (t) => {
	const io = await createPlatformIO();

	const jsonChunkText = JSON.stringify({
		asset: { version: '2.0' },
		scenes: [{ nodes: [0] }],
		nodes: [{ name: 'RootNode' }],
	} as GLTF.IGLTF);
	const jsonChunkData = BufferUtils.pad(BufferUtils.encodeText(jsonChunkText), 0x20);
	const totalByteLength = 12 + 8 + jsonChunkData.byteLength + 8 + 80;

	const glb = BufferUtils.concat([
		BufferUtils.toView(new Uint32Array([0x46546c67, 2, totalByteLength])),
		BufferUtils.toView(new Uint32Array([jsonChunkData.byteLength, 0x4e4f534a])),
		jsonChunkData,
		BufferUtils.toView(new Uint32Array([80, 0x12345678])),
		new Uint8Array(80).fill(0),
	]);

	const document = await io.readBinary(glb);
	t.truthy(document, 'parses GLB with unknown chunk');

	const node = document.getRoot().listNodes()[0];
	t.is(node.getName(), 'RootNode', 'parses nodes');
});
