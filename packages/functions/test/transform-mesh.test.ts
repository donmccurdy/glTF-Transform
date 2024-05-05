import test from 'ava';
import { bbox, Document, Primitive, PrimitiveTarget, vec3 } from '@gltf-transform/core';
import { logger, mat4, round, roundBbox } from '@gltf-transform/test-utils';
import { transformMesh, transformPrimitive } from '@gltf-transform/functions';

test('basic', async (t) => {
	const document = new Document().setLogger(logger);
	const prim = createPrimitive(document);
	const normal = prim.getAttribute('NORMAL')!;
	const tangent = prim.getAttribute('TANGENT')!;

	transformPrimitive(prim, mat4.identity([]));
	t.deepEqual(primBounds(prim), { min: [-0.5, 10, -0.5], max: [0.5, 10, 0.5] }, 'identity - position');
	t.deepEqual(normal.getElement(0, []), [0, 1, 0], 'identity - normal');
	t.deepEqual(tangent.getElement(0, []), [1, 0, 0, 1], 'identity - tangent');

	transformPrimitive(prim, mat4.fromScaling([], [2, 1, 2]));
	t.deepEqual(primBounds(prim), { min: [-1, 10, -1], max: [1, 10, 1] }, 'scale - position');
	t.deepEqual(normal.getElement(0, []), [0, 1, 0], 'scale - normal');
	t.deepEqual(tangent.getElement(0, []), [1, 0, 0, 1], 'scale - tangent');

	transformPrimitive(prim, mat4.fromTranslation([], [0, -10, 0]));
	t.deepEqual(primBounds(prim), { min: [-1, 0, -1], max: [1, 0, 1] }, 'translate - positino');
	t.deepEqual(normal.getElement(0, []), [0, 1, 0], 'translate - normal');
	t.deepEqual(tangent.getElement(0, []), [1, 0, 0, 1], 'translate - tangent');

	transformPrimitive(prim, mat4.fromRotation([], Math.PI / 2, [1, 0, 0]));
	t.deepEqual(roundBbox(primBounds(prim)), { min: [-1, -1, 0], max: [1, 1, 0] }, 'rotate - position');
	t.deepEqual(normal.getElement(0, []).map(round()), [0, 0, 1], 'rotate - normal');
	t.deepEqual(tangent.getElement(0, []).map(round()), [1, 0, 0, 1], 'rotate - tangent');
});

test('shared prims', async (t) => {
	const document = new Document().setLogger(logger);
	const prim = createPrimitive(document);
	const meshA = document.createMesh('A').addPrimitive(prim);
	const meshB = document.createMesh('B').addPrimitive(prim);

	t.is(meshA.listPrimitives()[0], meshB.listPrimitives()[0], 'meshA = meshB, before');

	transformMesh(meshA, mat4.fromScaling([], [2, 2, 2]));

	// Shared primitives must be cloned, and the copy transformed.
	t.true(meshA.listPrimitives()[0] !== meshB.listPrimitives()[0], 'meshA !== meshB, after');
});

test('shared vertex streams', async (t) => {
	const document = new Document().setLogger(logger);
	const prim = createPrimitive(document);
	const primA = prim.clone();
	const primB = prim.clone();
	const meshA = document.createMesh('A').addPrimitive(primA);
	document.createMesh('B').addPrimitive(primB);

	t.is(primA.getAttribute('POSITION'), primB.getAttribute('POSITION'), 'primA = primB, before');

	transformMesh(meshA, mat4.fromScaling([], [2, 2, 2]));

	// Option 'overwrite' option removed in v4, all primitives are now compacted
	// and their accessors cloned.
	t.true(
		primA.getAttribute('POSITION') !== primB.getAttribute('POSITION'),
		'primA !== primB, after (overwrite=true)',
	);
});

test('update multiple vertex streams', async (t) => {
	const document = new Document().setLogger(logger);
	const primA = createPrimitive(document);
	const primB = createPrimitive(document);
	const mesh = document.createMesh().addPrimitive(primA).addPrimitive(primB);

	transformMesh(mesh, mat4.fromScaling([], [2, 2, 2]));

	// prettier-ignore
	const SCALED = [
		0.5, 10, 0.5,
		0.5, 10, -0.5,
		-0.5, 10, -0.5,
		-0.5, 10, 0.5
	].map((value) => value * 2.0);

	t.deepEqual(Array.from(primA.getAttribute('POSITION').getArray()), SCALED, 'primA.POSITION');
	t.deepEqual(Array.from(primB.getAttribute('POSITION').getArray()), SCALED, 'primB.POSITION');
});

test('morph targets', async (t) => {
	const document = new Document().setLogger(logger);
	const primA = createPrimitive(document);
	const primB = primA.clone();
	const meshA = document.createMesh().addPrimitive(primA);
	const meshB = document.createMesh().addPrimitive(primB);

	const targetPosition = document
		.createAccessor()
		.setType('VEC3')
		.setArray(
			// prettier-ignore
			new Float32Array([
				0, 1, 0,
				0, 1, 0,
				0, 1, 0,
				0, 1, 0,
			]),
		);
	const target = document.createPrimitiveTarget().setAttribute('POSITION', targetPosition);
	primA.addTarget(target);
	primB.addTarget(target.clone());

	transformMesh(meshA, mat4.fromScaling([], [2, 2, 2]));

	t.deepEqual(
		Array.from(meshA.listPrimitives()[0].listTargets()[0].getAttribute('POSITION').getArray()),
		// prettier-ignore
		[
			0, 2, 0,
			0, 2, 0,
			0, 2, 0,
			0, 2, 0,
		],
		'scales target position',
	);

	t.deepEqual(
		Array.from(meshB.listPrimitives()[0].listTargets()[0].getAttribute('POSITION').getArray()),
		// prettier-ignore
		[
			0, 1, 0,
			0, 1, 0,
			0, 1, 0,
			0, 1, 0,
		],
		'skips shared target position',
	);
});

/* UTILITIES */

function primBounds(prim: Primitive | PrimitiveTarget): bbox {
	return {
		min: prim.getAttribute('POSITION')!.getMinNormalized([]) as vec3,
		max: prim.getAttribute('POSITION')!.getMaxNormalized([]) as vec3,
	};
}

function createPrimitive(document: Document): Primitive {
	const prim = document
		.createPrimitive()
		.setMode(Primitive.Mode.POINTS)
		.setAttribute(
			'POSITION',
			// prettier-ignore
			document
				.createAccessor('POSITION')
				.setType('VEC3')
				.setArray(new Float32Array([
					0.5, 10, 0.5,
					0.5, 10, -0.5,
					-0.5, 10, -0.5,
					-0.5, 10, 0.5,
				])),
		)
		.setAttribute(
			'NORMAL',
			// prettier-ignore
			document
				.createAccessor('NORMAL')
				.setType('VEC3')
				.setArray(
					new Float32Array([
						0, 1, 0,
						0, 1, 0,
						0, 1, 0,
						0, 1, 0,
					])
				),
		)
		.setAttribute(
			'TANGENT',
			// prettier-ignore
			document
				.createAccessor('TANGENT')
				.setType('VEC4')
				.setArray(
					new Float32Array([
						1, 0, 0, 1,
						1, 0, 0, 1,
						1, 0, 0, 1,
						1, 0, 0, 1,
					])
				),
		);
	return prim;
}
