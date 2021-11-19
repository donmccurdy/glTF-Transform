require('source-map-support').install();

import test from 'tape';
import { bbox, bounds, Document, Logger, Primitive, PrimitiveTarget, Scene, vec3 } from '@gltf-transform/core';
import { dequantize } from '../';

const logger = new Logger(Logger.Verbosity.WARN);

test('@gltf-transform/functions::dequantize', async (t) => {
	const doc = new Document().setLogger(logger);
	const scene = createScene(doc);
	const node = doc.getRoot().listNodes()[0];
	const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];

	const bboxScenePrev = bounds(scene);
	const bboxNodePrev = bounds(node);
	const bboxMeshPrev = primBounds(prim);

	t.deepEquals(bboxScenePrev, { min: [0, 0, 0], max: [50, 50, 50] }, 'original bbox - scene');
	t.deepEquals(bboxNodePrev, { min: [0, 0, 0], max: [50, 50, 50] }, 'original bbox - node');
	t.deepEquals(bboxMeshPrev, { min: [0, 0, 0], max: [50, 50, 50] }, 'original bbox - mesh');

	await doc.transform(dequantize());

	const bboxScene = bounds(scene);
	const bboxNode = bounds(node);
	const bboxMesh = primBounds(prim);

	t.ok(prim.getAttribute('POSITION').getArray() instanceof Float32Array, 'position - float32');
	t.ok(prim.getAttribute('JOINTS_0').getArray() instanceof Uint8Array, 'joints - uint8');
	t.ok(prim.getAttribute('WEIGHTS_0').getArray() instanceof Float32Array, 'weights - float32');
	t.deepEquals(bboxScene, bboxScenePrev, 'bbox - scene');
	t.deepEquals(bboxNode, bboxNodePrev, 'bbox - nodeA');
	t.deepEquals(bboxMesh, bboxMeshPrev, 'bbox - meshA');
	t.equals(doc.getRoot().listNodes().length, 1, 'total nodes');
	t.equals(doc.getRoot().listAccessors().length, 3, 'total accessors');
	t.end();
});

/* UTILITIES */

function primBounds(prim: Primitive | PrimitiveTarget): bbox {
	return {
		min: prim.getAttribute('POSITION').getMinNormalized([]) as vec3,
		max: prim.getAttribute('POSITION').getMaxNormalized([]) as vec3,
	};
}

function createScene(doc: Document): Scene {
	const prim = doc
		.createPrimitive()
		.setMode(Primitive.Mode.TRIANGLES)
		.setAttribute(
			'POSITION',
			doc
				.createAccessor('POSITION')
				.setType('VEC3')
				.setArray(new Uint16Array([0, 0, 0, 10, 15, 8, 50, 50, 50, 15, 15, 0, 10, 10, 0]))
		)
		.setAttribute(
			'JOINTS_0',
			doc
				.createAccessor('JOINTS_0')
				.setType('VEC4')
				.setArray(new Uint8Array([0, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0, 4, 0, 0, 0]))
		)
		.setAttribute(
			'WEIGHTS_0',
			doc
				.createAccessor('WEIGHTS_0')
				.setType('VEC4')
				.setArray(new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0]))
		);

	const scene = doc.createScene();
	scene.addChild(doc.createNode().setMesh(doc.createMesh().addPrimitive(prim)));
	return scene;
}
