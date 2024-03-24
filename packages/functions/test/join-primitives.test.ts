import test from 'ava';
import { Accessor, Document, Primitive } from '@gltf-transform/core';
import { joinPrimitives } from '@gltf-transform/functions';
import { logger } from '@gltf-transform/test-utils';

test('unindexed', async (t) => {
	const document = new Document().setLogger(logger);
	const [primA, positionA, colorA] = createPrimA(document);
	const [primB] = createPrimB(document);

	const primAB = joinPrimitives([primA, primB]);

	t.false(primA.isDisposed(), 'primA alive');
	t.false(primB.isDisposed(), 'primB alive');

	const positionAB = primAB.getAttribute('POSITION');
	const colorAB = primAB.getAttribute('COLOR_0');

	t.is(positionAB.getType(), positionA.getType(), 'position.type');
	t.is(colorAB.getType(), colorA.getType(), 'color.type');
	t.is(positionAB.getComponentType(), positionA.getComponentType(), 'position.componentType');
	t.is(colorAB.getComponentType(), colorA.getComponentType(), 'color.componentType');

	// prettier-ignore
	t.deepEqual(Array.from(positionAB.getArray()), [
		// primA
		0, 0, 0,
		0, 0, 1,
		0, 1, 0,
		1, 0, 0,
		0, 1, 1,
		1, 0, 1,
		// primB
		10, 10, 10,
		10, 10, 12,
		10, 12, 10,
	], 'position data');
	// prettier-ignore
	t.deepEqual(Array.from(colorAB.getArray()), [
		// primA
		255, 0, 0, 255,
		0, 255, 0, 255,
		0, 0, 255, 255,
		255, 0, 0, 255,
		0, 255, 0, 255,
		0, 0, 255, 255,
		// primB
		0, 0, 0, 255,
		0, 0, 0, 127,
		0, 0, 0, 0,
	], 'position data');

	t.is(primAB.getIndices(), null, 'indices data');
});

test('indexed', async (t) => {
	const document = new Document().setLogger(logger);
	const [primA, positionA, colorA] = createPrimA(document);
	const [primB] = createPrimB(document);

	const indicesA = document.createAccessor().setArray(new Uint16Array([0, 2, 4]));
	const indicesB = document.createAccessor().setArray(new Uint16Array([0, 1, 2]));

	primA.setIndices(indicesA);
	primB.setIndices(indicesB);

	const primAB = joinPrimitives([primA, primB]);

	t.false(primA.isDisposed(), 'primA alive');
	t.false(primB.isDisposed(), 'primB alive');

	const positionAB = primAB.getAttribute('POSITION');
	const colorAB = primAB.getAttribute('COLOR_0');

	t.is(positionAB.getType(), positionA.getType(), 'position.type');
	t.is(colorAB.getType(), colorA.getType(), 'color.type');
	t.is(positionAB.getComponentType(), positionA.getComponentType(), 'position.componentType');
	t.is(colorAB.getComponentType(), colorA.getComponentType(), 'color.componentType');

	// prettier-ignore
	t.deepEqual(Array.from(positionAB.getArray()), [
		// primA
		0, 0, 0,
		// 0, 0, 1, ❌
		0, 1, 0,
		// 1, 0, 0, ❌
		0, 1, 1,
		// 1, 0, 1, ❌
		// primB
		10, 10, 10,
		10, 10, 12,
		10, 12, 10,
	], 'position data');
	// prettier-ignore
	t.deepEqual(Array.from(colorAB.getArray()), [
		// primA
		255, 0, 0, 255,
		// 0, 255, 0, 255, ❌
		0, 0, 255, 255,
		// 255, 0, 0, 255, ❌
		0, 255, 0, 255,
		// 0, 0, 255, 255, ❌
		// primB
		0, 0, 0, 255,
		0, 0, 0, 127,
		0, 0, 0, 0,
	], 'position data');

	t.deepEqual(Array.from(primAB.getIndices().getArray()), [0, 1, 2, 3, 4, 5], 'indices data');
});

/******************************************************************************
 * UTILITIES
 */

function createPrimA(document: Document): [Primitive, Accessor, Accessor] {
	// prettier-ignore
	const positionA = document.createAccessor()
		.setType('VEC3')
		.setArray(new Uint16Array([
			0, 0, 0,
			0, 0, 1,
			0, 1, 0,
			1, 0, 0,
			0, 1, 1,
			1, 0, 1,
		]));
	// prettier-ignore
	const colorA = document.createAccessor()
		.setType('VEC4')
		.setNormalized(true)
		.setArray(new Uint8Array([
			255, 0, 0, 255,
			0, 255, 0, 255,
			0, 0, 255, 255,
			255, 0, 0, 255,
			0, 255, 0, 255,
			0, 0, 255, 255,
		]));

	const primA = document.createPrimitive().setAttribute('POSITION', positionA).setAttribute('COLOR_0', colorA);

	return [primA, positionA, colorA];
}

function createPrimB(document: Document): [Primitive, Accessor, Accessor] {
	// prettier-ignore
	const positionB = document.createAccessor()
		.setType('VEC3')
		.setArray(new Uint16Array([
			10, 10, 10,
			10, 10, 12,
			10, 12, 10,
		]));
	// prettier-ignore
	const colorB = document.createAccessor()
		.setType('VEC4')
		.setNormalized(true)
		.setArray(new Uint8Array([
			0, 0, 0, 255,
			0, 0, 0, 127,
			0, 0, 0, 0,
		]));

	const primB = document.createPrimitive().setAttribute('POSITION', positionB).setAttribute('COLOR_0', colorB);

	return [primB, positionB, colorB];
}
