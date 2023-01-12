require('source-map-support').install();

import test from 'tape';
import { Document, Logger } from '@gltf-transform/core';
import { getNodeScene } from '@gltf-transform/functions';

const logger = new Logger(Logger.Verbosity.SILENT);

test('@gltf-transform/functions::getNodeScene', async (t) => {
	const document = new Document().setLogger(logger);
	const nodeA = document.createNode('A').setTranslation([2, 0, 0]);
	const nodeB = document.createNode('B').setScale([4, 4, 4]).addChild(nodeA);
	const nodeC = document.createNode('C').addChild(nodeB);
	const scene = document.createScene().addChild(nodeC);

	t.equals(getNodeScene(nodeA), scene, 'A → Scene');
	t.equals(getNodeScene(nodeB), scene, 'B → Scene');
	t.equals(getNodeScene(nodeC), scene, 'C → Scene');

	scene.removeChild(nodeC);

	t.equals(getNodeScene(nodeA), null, 'A → null');
	t.equals(getNodeScene(nodeB), null, 'B → null');
	t.equals(getNodeScene(nodeC), null, 'C → null');

	t.end();
});
