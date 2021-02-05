require('source-map-support').install();

import test from 'tape';
import { Document, NodeIO } from '../../';

test('@gltf-transform/core::camera', t => {
	const doc = new Document();

	doc.createCamera('p')
		.setType('perspective')
		.setZNear(0.1)
		.setZFar(10)
		.setYFov(Math.PI / 5)
		.setAspectRatio(.5);

	doc.createCamera('o')
		.setType('orthographic')
		.setZNear(10)
		.setZFar(100)
		.setXMag(50)
		.setYMag(25);

	const io = new NodeIO();

	const options = {basename: 'cameraTest'};
	const jsonDoc = io.writeJSON(io.readJSON(io.writeJSON(doc, options)), options);

	t.deepEqual(jsonDoc.json.cameras[0], {
		name: 'p',
		type: 'perspective',
		perspective: {
			znear: 0.1,
			zfar: 10,
			yfov: Math.PI / 5,
			aspectRatio: .5,
		}
	}, 'perspective camera');

	t.deepEqual(jsonDoc.json.cameras[1], {
		name: 'o',
		type: 'orthographic',
		orthographic: {
			znear: 10,
			zfar: 100,
			xmag: 50,
			ymag: 25,
		}
	}, 'orthographic camera');

	t.end();
});

test('@gltf-transform/core::camera | copy', t => {
	const doc = new Document();

	const a = doc.createCamera('MyPerspectiveCamera')
		.setType('perspective')
		.setZNear(0.1)
		.setZFar(10)
		.setYFov(Math.PI / 5)
		.setAspectRatio(.5);
	const b = doc.createCamera('MyOrthoCamera')
		.setType('orthographic')
		.setZNear(10)
		.setZFar(100)
		.setXMag(50)
		.setYMag(25);
	const c = doc.createCamera().copy(a);

	t.equal(c.getName(), a.getName(), 'copy name');
	t.equal(c.getType(), a.getType(), 'copy type');
	t.equal(c.getZNear(), a.getZNear(), 'copy znear');
	t.equal(c.getZFar(), a.getZFar(), 'copy zfar');
	t.equal(c.getYFov(), a.getYFov(), 'copy yfov');
	t.equal(c.getAspectRatio(), a.getAspectRatio(), 'copy aspectRatio');

	c.copy(b);

	t.equal(c.getName(), b.getName(), 'copy name');
	t.equal(c.getType(), b.getType(), 'copy type');
	t.equal(c.getZNear(), b.getZNear(), 'copy znear');
	t.equal(c.getZFar(), b.getZFar(), 'copy zfar');
	t.equal(c.getXMag(), b.getXMag(), 'copy xmag');
	t.equal(c.getYMag(), b.getYMag(), 'copy ymag');
	t.end();
});
