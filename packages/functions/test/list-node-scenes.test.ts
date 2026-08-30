import { deepEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document } from '@gltf-transform/core';
import { listNodeScenes } from '@gltf-transform/functions';
import { logger } from '@gltf-transform/test-utils';

describe('functions::listNodeScenes', () => {
	test('basic', async () => {
		const document = new Document().setLogger(logger);
		const nodeA = document.createNode('A').setTranslation([2, 0, 0]);
		const nodeB = document.createNode('B').setScale([4, 4, 4]).addChild(nodeA);
		const nodeC = document.createNode('C').addChild(nodeB);
		const sceneA = document.createScene().addChild(nodeC);
		const sceneB = document.createScene().addChild(nodeC);

		deepEqual(listNodeScenes(nodeA), [sceneA, sceneB], 'A → Scene');
		deepEqual(listNodeScenes(nodeB), [sceneA, sceneB], 'B → Scene');
		deepEqual(listNodeScenes(nodeC), [sceneA, sceneB], 'C → Scene');

		sceneA.removeChild(nodeC);

		deepEqual(listNodeScenes(nodeA), [sceneB], 'A → null');
		deepEqual(listNodeScenes(nodeB), [sceneB], 'B → null');
		deepEqual(listNodeScenes(nodeC), [sceneB], 'C → null');

		sceneB.removeChild(nodeC);

		deepEqual(listNodeScenes(nodeA), [], 'A → null');
		deepEqual(listNodeScenes(nodeB), [], 'B → null');
		deepEqual(listNodeScenes(nodeC), [], 'C → null');
	});
});
