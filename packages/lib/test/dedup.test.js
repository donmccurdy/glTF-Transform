require('source-map-support').install();

const path = require('path');
const test = require('tape');
const { createCanvas } = require('canvas');

const { Document, NodeIO } = require ('@gltf-transform/core');
const { dedup } = require('../');

test('@gltf-transform/lib::dedup | accessors', t => {
	const io = new NodeIO();
	const doc = io.read(path.join(__dirname, 'in/many-cubes.gltf'));
	t.equal(doc.getRoot().listAccessors().length, 1503, 'begins with duplicate accessors');

	dedup({accessors: false})(doc);

	t.equal(doc.getRoot().listAccessors().length, 1503, 'has no effect when disabled');

	dedup()(doc);

	t.equal(doc.getRoot().listAccessors().length, 3, 'prunes duplicate accessors');
	t.end();
});

test('@gltf-transform/lib::dedup | textures', t => {
	const doc = new Document();

	const canvas = createCanvas(100, 50);
	const ctx = canvas.getContext("2d");
	ctx.fillStyle = "#222222";
	const buffer = canvas.toBuffer("image/png").slice().buffer;

	doc.createTexture('copy 1').setMimeType('image/png').setImage(buffer);
	doc.createTexture('copy 2').setMimeType('image/png').setImage(buffer.slice())

	t.equal(doc.getRoot().listTextures().length, 2, 'begins with duplicate textures');

	dedup({textures: false})(doc);

	t.equal(doc.getRoot().listTextures().length, 2, 'has no effect when disabled');

	dedup()(doc);

	t.equal(doc.getRoot().listTextures().length, 1, 'prunes duplicate textures');
	t.end();
});
