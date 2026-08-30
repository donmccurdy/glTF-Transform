import { deepEqual, ok } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document } from '@gltf-transform/core';
import { clearNodeParent } from '@gltf-transform/functions';
import { logger } from '@gltf-transform/test-utils';

describe('functions::clearNodeParent', () => {
	test('basic', async () => {
		const document = new Document().setLogger(logger);
		const nodeA = document.createNode('A').setTranslation([2, 0, 0]);
		const nodeB = document.createNode('B').setScale([4, 4, 4]).addChild(nodeA);
		const nodeC = document.createNode('C').addChild(nodeB);
		const scene = document.createScene().addChild(nodeC);

		ok(nodeA.getParentNode() === nodeB, 'B → A (before)');
		ok(nodeB.getParentNode() === nodeC, 'C → B (before)');
		ok(nodeC.getParentNode() === null, 'Scene → C (before)');
		deepEqual(scene.listChildren(), [nodeC], 'Scene → C (before)');

		clearNodeParent(nodeA);

		ok(nodeA.getParentNode() === null, 'Scene → A (after)');
		ok(nodeB.getParentNode() === nodeC, 'C → B (after)');
		ok(nodeC.getParentNode() === null, 'Scene → C (after)');
		deepEqual(scene.listChildren(), [nodeC, nodeA], 'Scene → [C, A] (after)');

		deepEqual(nodeA.getTranslation(), [8, 0, 0], 'A.translation');
		deepEqual(nodeA.getScale(), [4, 4, 4], 'A.scale');
		deepEqual(nodeB.getScale(), [4, 4, 4], 'B.scale');
	});
});
