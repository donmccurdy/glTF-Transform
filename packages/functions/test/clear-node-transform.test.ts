import { deepEqual, ok } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document } from '@gltf-transform/core';
import { clearNodeTransform } from '@gltf-transform/functions';
import { logger } from '@gltf-transform/test-utils';

describe('functions::clearNodeTransform', () => {
	test('basic', async () => {
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

		deepEqual(parentNode.getTranslation(), [0, 0, 0], 'parent.translation');
		deepEqual(parentNode.getRotation(), [0, 0, 0, 1], 'parent.rotation');
		deepEqual(parentNode.getScale(), [1, 1, 1], 'parent.scale');

		deepEqual(childNode.getTranslation(), [2, 0, 0], 'child.children[0].translation');
		deepEqual(childNode.getRotation(), [0, 0, 0, 1], 'child.children[0].rotation');
		deepEqual(childNode.getScale(), [4, 4, 4], 'child.children[0].scale');

		ok(parentNode.getCamera(), 'parent.camera');
		deepEqual(prim.getAttribute('POSITION')!.getElement(0, []), [6, 0, 4], 'parent.mesh');
	});
});
