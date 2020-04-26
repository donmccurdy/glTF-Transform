require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');
const { createCanvas } = require('canvas');

const { Container, NodeIO } = require ('@gltf-transform/core');
const { prune } = require('../');

test('@gltf-transform/prune | accessors', t => {
  const io = new NodeIO(fs, path);
  const container = io.read(path.join(__dirname, 'in/many-cubes.gltf'));
  t.equal(container.getRoot().listAccessors().length, 1503, 'begins with duplicate accessors');

  prune({accessors: false})(container);

  t.equal(container.getRoot().listAccessors().length, 1503, 'has no effect when disabled');

  prune()(container);

  t.equal(container.getRoot().listAccessors().length, 3, 'prunes duplicate accessors');
  t.end();
});

test('@gltf-transform/prune | textures', t => {
	const container = new Container();

	const canvas = createCanvas(100, 50);
	const ctx = canvas.getContext("2d");
	ctx.fillStyle = "#222222";
	const buffer = canvas.toBuffer("image/png").slice().buffer;

	container.createTexture('copy 1').setMimeType('image/png').setImage(buffer);
	container.createTexture('copy 2').setMimeType('image/png').setImage(buffer.slice())

	t.equal(container.getRoot().listTextures().length, 2, 'begins with duplicate textures');

	prune({textures: false})(container);

	t.equal(container.getRoot().listTextures().length, 2, 'has no effect when disabled');

	prune()(container);

	t.equal(container.getRoot().listTextures().length, 1, 'prunes duplicate textures');
	t.end();
});
