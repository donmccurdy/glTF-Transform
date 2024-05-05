import test from 'ava';
import { Document } from '@gltf-transform/core';
import { clearNodeTransform } from '@gltf-transform/functions';
import { logger } from '@gltf-transform/test-utils';

test('basic', async (t) => {
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

	t.deepEqual(parentNode.getTranslation(), [0, 0, 0], 'parent.translation');
	t.deepEqual(parentNode.getRotation(), [0, 0, 0, 1], 'parent.rotation');
	t.deepEqual(parentNode.getScale(), [1, 1, 1], 'parent.scale');

	t.deepEqual(childNode.getTranslation(), [2, 0, 0], 'child.children[0].translation');
	t.deepEqual(childNode.getRotation(), [0, 0, 0, 1], 'child.children[0].rotation');
	t.deepEqual(childNode.getScale(), [4, 4, 4], 'child.children[0].scale');

	t.truthy(parentNode.getCamera(), 'parent.camera');
	t.deepEqual(prim.getAttribute('POSITION')!.getElement(0, []), [6, 0, 4], 'parent.mesh');
});
