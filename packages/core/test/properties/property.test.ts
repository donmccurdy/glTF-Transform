import test from 'tape';
import { Document, vec3 } from '@gltf-transform/core';

test('@gltf-transform/core::property | equals', async (t) => {
	const document = new Document();
	const nodeA = document.createNode();
	const nodeB = document.createNode();

	t.ok(nodeA.equals(nodeB), 'empty extras');

	nodeA.setExtras({ a: 1 });
	nodeB.setExtras({ a: 1 });

	t.ok(nodeA.equals(nodeB), 'same extras');

	nodeB.setExtras({ a: 1, b: 2 });

	t.notOk(nodeA.equals(nodeB), 'different extras');
	t.end();
});

test.only('@gltf-transform/core::property | internal arrays', async (t) => {
	const doc = new Document();
	const translation = [0, 0, 0] as vec3;
	const node = doc.createNode('A').setTranslation(translation);

	t.deepEquals(node.getTranslation(), [0, 0, 0], 'stores original value');

	// Array literals (vector, quaternion, color, …) must be stored as copies.
	translation[1] = 0.5;

	t.deepEquals(node.getTranslation(), [0, 0, 0], 'unchanged by external mutation');
	t.end();
});
