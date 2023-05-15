import test from 'ava';
import { Document, Logger } from '@gltf-transform/core';
import { listNodeScenes } from '@gltf-transform/functions';

const logger = new Logger(Logger.Verbosity.SILENT);

test('basic', async (t) => {
	const document = new Document().setLogger(logger);
	const nodeA = document.createNode('A').setTranslation([2, 0, 0]);
	const nodeB = document.createNode('B').setScale([4, 4, 4]).addChild(nodeA);
	const nodeC = document.createNode('C').addChild(nodeB);
	const sceneA = document.createScene().addChild(nodeC);
	const sceneB = document.createScene().addChild(nodeC);

	t.deepEqual(listNodeScenes(nodeA), [sceneA, sceneB], 'A → Scene');
	t.deepEqual(listNodeScenes(nodeB), [sceneA, sceneB], 'B → Scene');
	t.deepEqual(listNodeScenes(nodeC), [sceneA, sceneB], 'C → Scene');

	sceneA.removeChild(nodeC);

	t.deepEqual(listNodeScenes(nodeA), [sceneB], 'A → null');
	t.deepEqual(listNodeScenes(nodeB), [sceneB], 'B → null');
	t.deepEqual(listNodeScenes(nodeC), [sceneB], 'C → null');

	sceneB.removeChild(nodeC);

	t.deepEqual(listNodeScenes(nodeA), [], 'A → null');
	t.deepEqual(listNodeScenes(nodeB), [], 'B → null');
	t.deepEqual(listNodeScenes(nodeC), [], 'C → null');
});
