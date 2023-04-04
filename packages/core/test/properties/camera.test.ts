import test from 'ava';
import { Document } from '@gltf-transform/core';
import { createPlatformIO } from '@gltf-transform/test-utils';

test('basic', async (t) => {
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

	t.deepEqual(
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
		'perspective camera'
	);

	t.deepEqual(
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
		'orthographic camera'
	);
});

test('copy', (t) => {
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

	t.is(c.getName(), a.getName(), 'copy name');
	t.is(c.getType(), a.getType(), 'copy type');
	t.is(c.getZNear(), a.getZNear(), 'copy znear');
	t.is(c.getZFar(), a.getZFar(), 'copy zfar');
	t.is(c.getYFov(), a.getYFov(), 'copy yfov');
	t.is(c.getAspectRatio(), a.getAspectRatio(), 'copy aspectRatio');

	c.copy(b);

	t.is(c.getName(), b.getName(), 'copy name');
	t.is(c.getType(), b.getType(), 'copy type');
	t.is(c.getZNear(), b.getZNear(), 'copy znear');
	t.is(c.getZFar(), b.getZFar(), 'copy zfar');
	t.is(c.getXMag(), b.getXMag(), 'copy xmag');
	t.is(c.getYMag(), b.getYMag(), 'copy ymag');
});
