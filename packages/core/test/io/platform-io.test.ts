import test from 'tape';
import fs from 'fs';
import path from 'path';
import { BufferUtils, Document, Format, GLB_BUFFER, JSONDocument, NodeIO } from '@gltf-transform/core';

const throwsAsync = async (t: test.Test, fn: () => Promise<unknown>, re: RegExp, msg: string): Promise<void> => {
	try {
		await fn();
		t.fail(msg);
	} catch (e) {
		t.match((e as Error).message, re, msg);
	}
};

test('@gltf-transform/core::io | common', async (t) => {
	await throwsAsync(
		t,
		() =>
			new NodeIO().readJSON({
				json: { asset: { version: '1.0' } },
				resources: {},
			}),
		/Unsupported/,
		'1.0'
	);
	t.end();
});

test('@gltf-transform/core::io | glb without optional buffer', async (t) => {
	const doc = new Document();
	doc.createScene().addChild(doc.createNode('MyNode'));

	const io = new NodeIO();
	const json = await io.writeJSON(doc, { format: Format.GLB });
	const binary = await io.writeBinary(doc);

	t.ok(json, 'writes json');
	t.ok(binary, 'writes binary');
	t.equals(Object.values(json.resources).length, 0, 'no buffers');
	t.ok(await io.readJSON(json), 'reads json');
	t.ok(await io.readBinary(binary), 'reads binary');
	t.deepEquals(
		(await io.readBinary(binary))
			.getRoot()
			.listNodes()
			.map((n) => n.getName()),
		['MyNode'],
		'same nodes'
	);
	t.end();
});

test('@gltf-transform/core::io | glb without required buffer', async (t) => {
	const io = new NodeIO();

	let doc = new Document();
	doc.createTexture('TexA').setImage(new Uint8Array(1)).setMimeType('image/png');
	doc.createTexture('TexB').setImage(new Uint8Array(2)).setMimeType('image/png');

	await throwsAsync(t, () => io.writeJSON(doc, { format: Format.GLB }), /buffer required/i, 'writeJSON throws');
	await throwsAsync(t, () => io.writeBinary(doc), /buffer required/i, 'writeBinary throws');

	doc.createBuffer();

	t.ok(io.writeJSON(doc, { format: Format.GLB }), 'writeJSON suceeds');
	t.ok(io.writeBinary(doc), 'writeBinary succeeds');

	doc = new Document();
	doc.createAccessor().setArray(new Float32Array(10));
	doc.createAccessor().setArray(new Float32Array(20));

	await throwsAsync(t, () => io.writeJSON(doc, { format: Format.GLB }), /buffer required/i, 'writeJSON throws');
	await throwsAsync(t, () => io.writeBinary(doc), /buffer required/i, 'writeBinary throws');

	doc.createBuffer();

	t.ok(await io.writeJSON(doc, { format: Format.GLB }), 'writeJSON suceeds');
	t.ok(await io.writeBinary(doc), 'writeBinary succeeds');
	t.end();
});

test('@gltf-transform/core::io | glb with texture-only buffer', async (t) => {
	const doc = new Document();
	doc.createTexture('TexA').setImage(new Uint8Array(1)).setMimeType('image/png');
	doc.createTexture('TexB').setImage(new Uint8Array(2)).setMimeType('image/png');
	doc.createBuffer();

	const io = new NodeIO();
	const json = await io.writeJSON(doc, { format: Format.GLB });
	const binary = await io.writeBinary(doc);

	t.ok(json, 'writes json');
	t.ok(binary, 'writes binary');
	t.equals(Object.values(json.resources).length, 1, 'writes 1 buffer');

	const rtTextures = (await io.readBinary(binary)).getRoot().listTextures();

	t.equals(rtTextures[0].getName(), 'TexA', 'reads texture 1');
	t.equals(rtTextures[1].getName(), 'TexB', 'reads texture 1');
	t.deepEquals(rtTextures[0].getImage(), new Uint8Array(1), 'reads texture 1 data');
	t.deepEquals(rtTextures[1].getImage(), new Uint8Array(2), 'reads texture 2 data');
	t.end();
});

test('@gltf-transform/core::io | glb with data uri', async (t) => {
	const doc = new Document();
	doc.createTexture('TexA').setImage(new Uint8Array(1)).setMimeType('image/png');
	doc.createTexture('TexB').setImage(new Uint8Array(2)).setMimeType('image/png');
	doc.createBuffer();

	// (1) Write JSONDocument and replace resources with Data URIs.

	const io = new NodeIO();
	const { json, resources } = await io.writeJSON(doc, { format: Format.GLB });
	for (const buffer of json.buffers!) {
		const uri = buffer.uri || GLB_BUFFER;
		const resource = resources[uri]!;
		buffer.uri = `data:text/plain;base64,` + Buffer.from(resource).toString('base64');
		delete resources[uri];
	}

	t.ok(json, 'writes json');
	t.ok(json.buffers[0].uri.startsWith('data:'), 'buffer contains data uri');
	t.equals(Object.values(resources).length, 0, 'no external resources');

	// (2) Convert the JSONDocument to a GLB without a BIN chunk.

	const header = new Uint32Array([0x46546c67, 2, 12]);

	const jsonText = JSON.stringify(json);
	const jsonChunkData = BufferUtils.pad(BufferUtils.encodeText(jsonText), 0x20);
	const jsonChunkHeader = BufferUtils.toView(new Uint32Array([jsonChunkData.byteLength, 0x4e4f534a]));
	const jsonChunk = BufferUtils.concat([jsonChunkHeader, jsonChunkData]);
	header[header.length - 1] += jsonChunk.byteLength;

	const binary = BufferUtils.concat([BufferUtils.toView(header), jsonChunk]);

	t.ok(binary, 'writes binary');

	// (3) Test that we can read GLBs with Data URIs.

	const rtTextures = (await io.readBinary(binary)).getRoot().listTextures();

	t.equals(rtTextures[0].getName(), 'TexA', 'reads texture 1');
	t.equals(rtTextures[1].getName(), 'TexB', 'reads texture 1');
	t.deepEquals(Array.from(rtTextures[0].getImage()), Array.from(new Uint8Array(1)), 'reads texture 1 data');
	t.deepEquals(Array.from(rtTextures[1].getImage()), Array.from(new Uint8Array(2)), 'reads texture 2 data');
	t.end();
});

test('@gltf-transform/core::io | gltf embedded', async (t) => {
	const io = new NodeIO();
	const jsonPath = path.resolve(__dirname, '../in/Box_glTF-Embedded/Box.gltf');
	const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
	const json = JSON.parse(jsonContent);
	const jsonDoc = { json, resources: {} } as JSONDocument;
	const jsonDocCopy = JSON.parse(JSON.stringify(jsonDoc));

	t.ok(await io.readJSON(jsonDoc), 'reads document');
	t.deepEquals(jsonDoc, jsonDocCopy, 'original unchanged');
	t.end();
});
