require('source-map-support').install();

import test from 'tape';
import { Document, Logger } from '@gltf-transform/core';
import { clearNodeTransform } from '@gltf-transform/functions';

const logger = new Logger(Logger.Verbosity.SILENT);

test('@gltf-transform/functions::clearNodeTransform', async (t) => {
	const document = new Document().setLogger(logger);

	const camera = document.createCamera();

	const position = document
		.createAccessor()
		.setType('VEC3')
		.setArray(new Float32Array([1, 0, 1]));
	const prim = document.createPrimitive().setAttribute('POSITION', position);
	const mesh = document.createMesh().addPrimitive(prim);

	const childNode = document.createNode('B');

	const parentNode = document
		.createNode('A')
		.setTranslation([2, 0, 0])
		.setScale([4, 4, 4])
		.addChild(childNode)
		.setMesh(mesh)
		.setCamera(camera);

	clearNodeTransform(parentNode);

	t.deepEquals(parentNode.getTranslation(), [0, 0, 0], 'parent.translation');
	t.deepEquals(parentNode.getRotation(), [0, 0, 0, 1], 'parent.rotation');
	t.deepEquals(parentNode.getScale(), [1, 1, 1], 'parent.scale');

	t.deepEquals(childNode.getTranslation(), [2, 0, 0], 'child.children[0].translation');
	t.deepEquals(childNode.getRotation(), [0, 0, 0, 1], 'child.children[0].rotation');
	t.deepEquals(childNode.getScale(), [4, 4, 4], 'child.children[0].scale');

	t.ok(parentNode.getCamera(), 'parent.camera');
	t.deepEquals(position.getElement(0, []), [6, 0, 4], 'parent.mesh');

	t.end();
});
