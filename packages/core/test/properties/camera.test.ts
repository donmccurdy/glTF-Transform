import { deepEqual, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document } from '@gltf-transform/core';
import { createPlatformIO } from '@gltf-transform/test-utils';

describe('core::Camera', () => {
	test('basic', async () => {
		const document = new Document();

		document
			.createCamera('p')
			.setType('perspective')
			.setZNear(0.1)
			.setZFar(10)
			.setYFov(Math.PI / 5)
			.setAspectRatio(0.5);

		document.createCamera('o').setType('orthographic').setZNear(10).setZFar(100).setXMag(50).setYMag(25);

		const io = await createPlatformIO();

		const options = { basename: 'cameraTest' };
		const jsonDoc = await io.writeJSON(await io.readJSON(await io.writeJSON(document, options)), options);

		deepEqual(
			jsonDoc.json.cameras[0],
			{
				name: 'p',
				type: 'perspective',
				perspective: {
					znear: 0.1,
					zfar: 10,
					yfov: Math.PI / 5,
					aspectRatio: 0.5,
				},
			},
			'perspective camera',
		);

		deepEqual(
			jsonDoc.json.cameras[1],
			{
				name: 'o',
				type: 'orthographic',
				orthographic: {
					znear: 10,
					zfar: 100,
					xmag: 50,
					ymag: 25,
				},
			},
			'orthographic camera',
		);
	});

	test('copy', () => {
		const document = new Document();

		const a = document
			.createCamera('MyPerspectiveCamera')
			.setType('perspective')
			.setZNear(0.1)
			.setZFar(10)
			.setYFov(Math.PI / 5)
			.setAspectRatio(0.5);
		const b = document
			.createCamera('MyOrthoCamera')
			.setType('orthographic')
			.setZNear(10)
			.setZFar(100)
			.setXMag(50)
			.setYMag(25);
		const c = document.createCamera().copy(a);

		strictEqual(c.getName(), a.getName(), 'copy name');
		strictEqual(c.getType(), a.getType(), 'copy type');
		strictEqual(c.getZNear(), a.getZNear(), 'copy znear');
		strictEqual(c.getZFar(), a.getZFar(), 'copy zfar');
		strictEqual(c.getYFov(), a.getYFov(), 'copy yfov');
		strictEqual(c.getAspectRatio(), a.getAspectRatio(), 'copy aspectRatio');

		c.copy(b);

		strictEqual(c.getName(), b.getName(), 'copy name');
		strictEqual(c.getType(), b.getType(), 'copy type');
		strictEqual(c.getZNear(), b.getZNear(), 'copy znear');
		strictEqual(c.getZFar(), b.getZFar(), 'copy zfar');
		strictEqual(c.getXMag(), b.getXMag(), 'copy xmag');
		strictEqual(c.getYMag(), b.getYMag(), 'copy ymag');
	});
});
