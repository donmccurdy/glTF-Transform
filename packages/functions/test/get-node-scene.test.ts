import test from 'ava';
import { Document, Logger } from '@gltf-transform/core';
import { getNodeScene } from '@gltf-transform/functions';

const logger = new Logger(Logger.Verbosity.SILENT);

test('basic', async (t) => {
	const document = new Document().setLogger(logger);
	const nodeA = document.createNode('A').setTranslation([2, 0, 0]);
	const nodeB = document.createNode('B').setScale([4, 4, 4]).addChild(nodeA);
	const nodeC = document.createNode('C').addChild(nodeB);
	const scene = document.createScene().addChild(nodeC);

	t.is(getNodeScene(nodeA), scene, 'A → Scene');
	t.is(getNodeScene(nodeB), scene, 'B → Scene');
	t.is(getNodeScene(nodeC), scene, 'C → Scene');

	scene.removeChild(nodeC);

	t.is(getNodeScene(nodeA), null, 'A → null');
	t.is(getNodeScene(nodeB), null, 'B → null');
	t.is(getNodeScene(nodeC), null, 'C → null');
});
