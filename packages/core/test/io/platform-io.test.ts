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
