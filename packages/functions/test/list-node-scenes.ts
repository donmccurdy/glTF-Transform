import test from 'ava';
import { Document, Logger } from '@gltf-transform/core';
import { listNodeScenes } from '@gltf-transform/functions';

const logger = new Logger(Logger.Verbosity.SILENT);

test('@gltf-transform/functions::listNodeScenes', async (t) => {
	const document = new Document().setLogger(logger);
	const nodeA = document.createNode('A').setTranslation([2, 0, 0]);
	const nodeB = document.createNode('B').setScale([4, 4, 4]).addChild(nodeA);
	const nodeC = document.createNode('C').addChild(nodeB);
	const scene = document.createScene().addChild(nodeC);

	t.deepEqual(listNodeScenes(nodeA), [scene], 'A → Scene');
	t.deepEqual(listNodeScenes(nodeB), [scene], 'B → Scene');
	t.deepEqual(listNodeScenes(nodeC), [scene], 'C → Scene');

	scene.removeChild(nodeC);

	t.deepEqual(listNodeScenes(nodeA), [], 'A → null');
	t.deepEqual(listNodeScenes(nodeB), [], 'B → null');
	t.deepEqual(listNodeScenes(nodeC), [], 'C → null');
});
