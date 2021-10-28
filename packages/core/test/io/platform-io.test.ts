require('source-map-support').install();

import test from 'tape';
import fs from 'fs';
import path from 'path';
import { Document, Format, JSONDocument, NodeIO } from '../../';

test('@gltf-transform/core::io | common', t => {
	t.throws(() => new NodeIO().readJSON({
		json: {asset: {version: '1.0'}},
		resources: {},
	}), '1.0');
	t.end();
});

test('@gltf-transform/core::io | glb without optional buffer', t => {
	const doc = new Document();
	doc.createScene().addChild(doc.createNode('MyNode'));

	const io = new NodeIO();
	const json = io.writeJSON(doc, {format: Format.GLB});
	const binary = io.writeBinary(doc);

	t.ok(json, 'writes json');
	t.ok(binary, 'writes binary');
	t.equals(Object.values(json.resources).length, 0, 'no buffers');
	t.ok(io.readJSON(json), 'reads json');
	t.ok(io.readBinary(binary), 'reads binary');
	t.deepEquals(
		io.readBinary(binary).getRoot().listNodes().map((n) => n.getName()),
		['MyNode'],
		'same nodes',
	);
	t.end();
});

test('@gltf-transform/core::io | glb without required buffer', t => {
	const io = new NodeIO();

	let doc = new Document();
	doc.createTexture('TexA').setImage(new ArrayBuffer(1)).setMimeType('image/png');
	doc.createTexture('TexB').setImage(new ArrayBuffer(2)).setMimeType('image/png');

	t.throws(() => io.writeJSON(doc, {format: Format.GLB}), /buffer required/i, 'writeJSON throws');
	t.throws(() => io.writeBinary(doc), /buffer required/i, 'writeBinary throws');

	doc.createBuffer();

	t.ok(io.writeJSON(doc, {format: Format.GLB}), 'writeJSON suceeds');
	t.ok(io.writeBinary(doc), 'writeBinary succeeds');

	doc = new Document();
	doc.createAccessor().setArray(new Float32Array(10));
	doc.createAccessor().setArray(new Float32Array(20));

	t.throws(() => io.writeJSON(doc, {format: Format.GLB}), /buffer required/i, 'writeJSON throws');
	t.throws(() => io.writeBinary(doc), /buffer required/i, 'writeBinary throws');

	doc.createBuffer();

	t.ok(io.writeJSON(doc, {format: Format.GLB}), 'writeJSON suceeds');
	t.ok(io.writeBinary(doc), 'writeBinary succeeds');
	t.end();
});

test('@gltf-transform/core::io | glb with texture-only buffer', t => {
	const doc = new Document();
	doc.createTexture('TexA').setImage(new ArrayBuffer(1)).setMimeType('image/png');
	doc.createTexture('TexB').setImage(new ArrayBuffer(2)).setMimeType('image/png');
	doc.createBuffer();

	const io = new NodeIO();
	const json = io.writeJSON(doc, {format: Format.GLB});
	const binary = io.writeBinary(doc);

	t.ok(json, 'writes json');
	t.ok(binary, 'writes binary');
	t.equals(Object.values(json.resources).length, 1, 'writes 1 buffer');

	const rtTextures = io.readBinary(binary).getRoot().listTextures();

	t.equals(rtTextures[0].getName(), 'TexA', 'reads texture 1');
	t.equals(rtTextures[1].getName(), 'TexB', 'reads texture 1');
	t.deepEquals(rtTextures[0].getImage(), new ArrayBuffer(1), 'reads texture 1 data');
	t.deepEquals(rtTextures[1].getImage(), new ArrayBuffer(2), 'reads texture 2 data');
	t.end();
});

test('@gltf-transform/core::io | gltf embedded', t => {
	const io = new NodeIO();
	const jsonPath = path.resolve(__dirname, '../in/Box_glTF-Embedded/Box.gltf');
	const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
	const json = JSON.parse(jsonContent);
	const jsonDoc = {json, resources: {}} as JSONDocument;
	const jsonDocCopy = JSON.parse(JSON.stringify(jsonDoc));

	t.ok(io.readJSON(jsonDoc), 'reads document');
	t.deepEquals(jsonDoc, jsonDocCopy, 'original unchanged');
	t.end();
});
