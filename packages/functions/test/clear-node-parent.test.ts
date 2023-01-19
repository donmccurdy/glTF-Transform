require('source-map-support').install();

import test from 'tape';
import { Document, Logger } from '@gltf-transform/core';
import { clearNodeParent } from '@gltf-transform/functions';

const logger = new Logger(Logger.Verbosity.SILENT);

test('@gltf-transform/functions::clearNodeParent', async (t) => {
	const document = new Document().setLogger(logger);
	const nodeA = document.createNode('A').setTranslation([2, 0, 0]);
	const nodeB = document.createNode('B').setScale([4, 4, 4]).addChild(nodeA);
	const nodeC = document.createNode('C').addChild(nodeB);
	const scene = document.createScene().addChild(nodeC);

	t.ok(nodeA.getParent() === nodeB, 'B → A (before)');
	t.ok(nodeB.getParent() === nodeC, 'C → B (before)');
	t.ok(nodeC.getParent() === scene, 'Scene → C (before)');

	clearNodeParent(nodeA);

	t.ok(nodeA.getParent() === scene, 'Scene → A (after)');
	t.ok(nodeB.getParent() === nodeC, 'C → B (after)');
	t.ok(nodeC.getParent() === scene, 'Scene → C (after)');

	t.deepEquals(nodeA.getTranslation(), [8, 0, 0], 'A.translation');
	t.deepEquals(nodeA.getScale(), [4, 4, 4], 'A.scale');
	t.deepEquals(nodeB.getScale(), [4, 4, 4], 'B.scale');

	t.end();
});
