require('source-map-support').install();

import test from 'tape';
import { Document, Format, NodeIO } from '../../';

test('@gltf-transform/core::io | common', t => {
	t.throws(() => new NodeIO().readJSON({
		json: {asset: {version: '1.0'}},
		resources: {},
	}), '1.0');
	t.end();
});

test('@gltf-transform/core::io | glb without buffer', t => {
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

test('@gltf-transform/core::io | glb with texture-only buffer', t => {
	const doc = new Document();
	const texA = doc.createTexture('TexA').setImage(new ArrayBuffer(1)).setMimeType('image/png');
	const texB = doc.createTexture('TexB').setImage(new ArrayBuffer(2)).setMimeType('image/png');
	doc.createMaterial('MaterialA').setBaseColorTexture(texA);
	doc.createMaterial('MaterialB').setBaseColorTexture(texB);

	const io = new NodeIO();

	t.throws(() => io.writeJSON(doc, {format: Format.GLB}), 'no writeJSON without buffer');
	t.throws(() => io.writeBinary(doc), 'no writeBinary without buffer');

	doc.createBuffer();

	const json = io.writeJSON(doc, {format: Format.GLB});
	const binary = io.writeBinary(doc);

	t.ok(json, 'writes json');
	t.ok(binary, 'writes binary');
	t.equals(Object.values(json.resources).length, 1, 'writes 1 buffer');
	t.ok(io.readJSON(json), 'reads json');
	t.ok(io.readBinary(binary), 'reads binary');

	const rtTextures = io.readBinary(binary).getRoot()
		.listMaterials()
		.map((n) => n.getBaseColorTexture());

	t.equals(rtTextures[0].getName(), 'TexA', 'reads texture 1');
	t.equals(rtTextures[1].getName(), 'TexB', 'reads texture 1');
	t.deepEquals(rtTextures[0].getImage(), new ArrayBuffer(1), 'reads texture 1 data');
	t.deepEquals(rtTextures[1].getImage(), new ArrayBuffer(2), 'reads texture 2 data');
	t.end();
});
