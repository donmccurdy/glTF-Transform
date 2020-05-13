require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');
const { Document, NodeIO } = require('../');

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

	const io = new NodeIO(fs, path);

	const options = {basename: 'cameraTest'};
	const nativeDoc = io.createNativeDocument(io.createDocument(io.createNativeDocument(doc, options)), options);

	t.deepEqual(nativeDoc.json.cameras[0], {
		name: 'p',
		type: 'perspective',
		perspective: {
			znear: 0.1,
			zfar: 10,
			yfov: Math.PI / 5,
			aspectRatio: .5,
		}
	}, 'perspective camera');

	t.deepEqual(nativeDoc.json.cameras[1], {
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
