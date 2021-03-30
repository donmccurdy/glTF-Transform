require('source-map-support').install();

import path from 'path';
import { createCanvas } from 'canvas';
import test from 'tape';
import { Document, NodeIO, PropertyType } from '@gltf-transform/core';
import { dedup } from '../';

test('@gltf-transform/lib::dedup | accessors', t => {
	const io = new NodeIO();
	const doc = io.read(path.join(__dirname, 'in/many-cubes.gltf'));
	t.equal(doc.getRoot().listAccessors().length, 1503, 'begins with duplicate accessors');

	dedup({propertyTypes: [PropertyType.TEXTURE]})(doc);

	t.equal(doc.getRoot().listAccessors().length, 1503, 'has no effect when disabled');

	dedup()(doc);

	t.equal(doc.getRoot().listAccessors().length, 3, 'prunes duplicate accessors');
	t.end();
});

test('@gltf-transform/lib::dedup | meshes', t => {
	const io = new NodeIO();
	const doc = io.read(path.join(__dirname, 'in/many-cubes.gltf'));
	t.equal(doc.getRoot().listMeshes().length, 501, 'begins with duplicate meshes');

	dedup({propertyTypes: [PropertyType.ACCESSOR]})(doc);

	t.equal(doc.getRoot().listMeshes().length, 501, 'has no effect when disabled');

	dedup()(doc);

	t.equal(doc.getRoot().listMeshes().length, 1, 'prunes duplicate meshes');
	t.end();
});

test('@gltf-transform/lib::dedup | textures', t => {
	const doc = new Document();

	const canvas = createCanvas(100, 50);
	const ctx = canvas.getContext('2d');
	ctx.fillStyle = '#222222';
	const buffer = canvas.toBuffer('image/png').slice().buffer;

	doc.createTexture('copy 1').setMimeType('image/png').setImage(buffer);
	doc.createTexture('copy 2').setMimeType('image/png').setImage(buffer.slice(0));

	t.equal(doc.getRoot().listTextures().length, 2, 'begins with duplicate textures');

	dedup({propertyTypes: [PropertyType.ACCESSOR]})(doc);

	t.equal(doc.getRoot().listTextures().length, 2, 'has no effect when disabled');

	dedup()(doc);

	t.equal(doc.getRoot().listTextures().length, 1, 'prunes duplicate textures');
	t.end();
});
