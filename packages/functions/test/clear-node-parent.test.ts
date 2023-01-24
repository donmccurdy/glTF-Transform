import test from 'ava';
import { Document, Logger } from '@gltf-transform/core';
import { clearNodeParent } from '@gltf-transform/functions';

const logger = new Logger(Logger.Verbosity.SILENT);

test('@gltf-transform/functions::clearNodeParent', async (t) => {
	const document = new Document().setLogger(logger);
	const nodeA = document.createNode('A').setTranslation([2, 0, 0]);
	const nodeB = document.createNode('B').setScale([4, 4, 4]).addChild(nodeA);
	const nodeC = document.createNode('C').addChild(nodeB);
	const scene = document.createScene().addChild(nodeC);

	t.truthy(nodeA.getParent() === nodeB, 'B → A (before)');
	t.truthy(nodeB.getParent() === nodeC, 'C → B (before)');
	t.truthy(nodeC.getParent() === scene, 'Scene → C (before)');

	clearNodeParent(nodeA);

	t.truthy(nodeA.getParent() === scene, 'Scene → A (after)');
	t.truthy(nodeB.getParent() === nodeC, 'C → B (after)');
	t.truthy(nodeC.getParent() === scene, 'Scene → C (after)');

	t.deepEqual(nodeA.getTranslation(), [8, 0, 0], 'A.translation');
	t.deepEqual(nodeA.getScale(), [4, 4, 4], 'A.scale');
	t.deepEqual(nodeB.getScale(), [4, 4, 4], 'B.scale');
});
