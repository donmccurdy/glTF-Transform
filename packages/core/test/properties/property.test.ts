import test from 'tape';
import { Document } from '@gltf-transform/core';

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
