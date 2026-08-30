import { deepEqual, strictEqual, throws } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, MathUtils, type mat4, type vec3, type vec4 } from '@gltf-transform/core';
import { cloneDocument } from '@gltf-transform/functions';
import { createPlatformIO } from '@gltf-transform/test-utils';

describe('core::Node', () => {
	test('parent', () => {
		const document = new Document();
		const a = document.createNode('A');
		const b = document.createNode('B');
		const c = document.createNode('C');

		// 1. adding node as child of node must de-parent from <=1 node [and N scenes, tested in scene.test.ts]
		// 2. adding node as child of scene must de-parent from <=1 node [also tested in scene.test.ts]

		a.addChild(c);
		b.addChild(c);

		deepEqual(a.listChildren(), [], 'removes child from 1st parent');
		deepEqual(b.listChildren(), [c], 'adds child to 2nd parent');
	});

	test('copy', () => {
		const document = new Document();
		const node = document
			.createNode('MyNode')
			.setTranslation([1, 2, 3])
			.setRotation([1, 0, 1, 0])
			.setScale([2, 2, 2])
			.setWeights([1.5, 1.5])
			.setCamera(document.createCamera())
			.setMesh(document.createMesh())
			.setSkin(document.createSkin())
			.addChild(document.createNode('OtherNode'));

		// See {@link Node.copy}.
		throws(() => document.createNode().copy(node), { message: /Node cannot be copied/i }, 'cannot copy node');
	});

	test('traverse', () => {
		const document = new Document();
		const disposed = document.createNode('Four');
		const node = document
			.createNode('One')
			.addChild(document.createNode('Two').addChild(document.createNode('Three').addChild(disposed)));
		disposed.dispose();

		let count = 0;
		node.traverse((_) => count++);
		strictEqual(count, 3, 'traverses all nodes');
	});

	test('getWorldMatrix', () => {
		const document = new Document();
		const a = document.createNode('A').setTranslation([10, 0, 0]);
		const b = document.createNode('B').setTranslation([0, 5, 0]);
		a.addChild(b);

		deepEqual(b.getWorldTranslation(), [10, 5, 0], 'inherit translated position');
		deepEqual(b.getWorldRotation(), [0, 0, 0, 1], 'default rotation');
		deepEqual(b.getWorldScale(), [1, 1, 1], 'default scale');
		deepEqual(b.getWorldMatrix(), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 5, 0, 1], 'getWorldMatrix');

		b.setTranslation([0, 0, 1]);
		a.setTranslation([0, 0, 0]).setRotation([0.7071, 0, 0.7071, 0]);

		const pos = b.getWorldTranslation();
		deepEqual(pos[0].toFixed(3), '1.000', 'inherit rotated position.x');
		deepEqual(pos[1].toFixed(3), '0.000', 'inherit rotated position.y');
		deepEqual(pos[2].toFixed(3), '0.000', 'inherit rotated position.z');
	});

	test('setMatrix', () => {
		const document = new Document();
		const node = document.createNode('A').setTranslation([99, 99, 99]);

		const pos = [1, 2, 3] as vec3;
		const rot = [0, 0, 0, 1] as vec4;
		const scl = [10, 10, 10] as vec3;
		const mat = MathUtils.compose(pos, rot, scl, [] as unknown as mat4);

		node.setMatrix(mat);

		const posOut = node.getTranslation().map((v) => v.toFixed(1));
		const rotOut = node.getRotation().map((v) => v.toFixed(1));
		const sclOut = node.getScale().map((v) => v.toFixed(1));

		deepEqual(posOut, ['1.0', '2.0', '3.0'], 'translation');
		deepEqual(rotOut, ['0.0', '0.0', '0.0', '1.0'], 'rotation');
		deepEqual(sclOut, ['10.0', '10.0', '10.0'], 'scale');
	});

	test('extras', async () => {
		const io = await createPlatformIO();
		const document = new Document();
		document.createNode('A').setExtras({ foo: 1, bar: 2 });

		const doc2 = await io.readJSON(await io.writeJSON(document, { basename: 'test' }));

		deepEqual(document.getRoot().listNodes()[0].getExtras(), { foo: 1, bar: 2 }, 'stores extras');
		deepEqual(doc2.getRoot().listNodes()[0].getExtras(), { foo: 1, bar: 2 }, 'roundtrips extras');
	});

	test('identity transforms', async () => {
		const io = await createPlatformIO();
		const document = new Document();

		document.createNode('A');
		document.createNode('B').setTranslation([1, 2, 1]);
		document.createNode('C').setTranslation([1, 2, 1]).setRotation([1, 0, 0, 0]).setScale([1, 2, 1]);

		const { nodes } = (await io.writeJSON(document, { basename: 'test' })).json;

		const a = nodes.find((n) => n.name === 'A');
		const b = nodes.find((n) => n.name === 'B');
		const c = nodes.find((n) => n.name === 'C');

		deepEqual(
			a,
			{
				name: 'A',
			},
			'exclude identity transforms',
		);

		deepEqual(
			b,
			{
				name: 'B',
				translation: [1, 2, 1],
			},
			'has only set transform info',
		);

		deepEqual(
			c,
			{
				name: 'C',
				translation: [1, 2, 1],
				rotation: [1, 0, 0, 0],
				scale: [1, 2, 1],
			},
			'has transform info',
		);
	});

	test('getParentNode', () => {
		const srcDocument = new Document();
		const srcNodeA = srcDocument.createNode('A');
		const srcNodeB = srcDocument.createNode('B');
		const srcNodeC = srcDocument.createNode('C');
		srcNodeA.addChild(srcNodeB).addChild(srcNodeC);

		deepEqual(srcNodeA.listChildren(), [srcNodeB, srcNodeC], 'a.listChildren()');
		strictEqual(srcNodeB.getParentNode(), srcNodeA, 'b.getParentNode()');
		strictEqual(srcNodeC.getParentNode(), srcNodeA, 'c.getParentNode()');

		const dstDocument = cloneDocument(srcDocument);
		const [dstNodeA, dstNodeB, dstNodeC] = dstDocument.getRoot().listNodes();

		deepEqual(dstNodeA.listChildren(), [dstNodeB, dstNodeC], 'a.listChildren()');
		strictEqual(dstNodeB.getParentNode(), dstNodeA, 'b.getParentNode()');
		strictEqual(dstNodeC.getParentNode(), dstNodeA, 'c.getParentNode()');
	});
});
