import test from 'ava';
import { Accessor, Document, Primitive, vec2 } from '@gltf-transform/core';
import {
	getPrimitiveVertexCount,
	unweld,
	unwrap,
	unwrapPrimitives,
	VertexCountMethod,
} from '@gltf-transform/functions';
import { createTorusKnotPrimitive, logger } from '@gltf-transform/test-utils';
import * as watlas from 'watlas';

await watlas.Initialize();

test('unwrapPrimitives - unindexed', async (t) => {
	const document = new Document().setLogger(logger);
	const prim = createTorusKnotPrimitive(document, { tubularSegments: 6 });
	document.createMesh().addPrimitive(prim);

	await document.transform(unweld());

	t.falsy(prim.getIndices(), 'indices = null (initial)');

	unwrapPrimitives([prim], { watlas, overwrite: false });

	t.falsy(prim.getIndices(), 'indices = null (overwrite=false)');

	unwrapPrimitives([prim], { watlas, overwrite: true });

	t.truthy(prim.getIndices(), 'indices != null (overwrite=true)');
});

test('unwrapPrimitives - vertex count', async (t) => {
	const document = new Document().setLogger(logger);
	const prim = createTorusKnotPrimitive(document, { tubularSegments: 6 });

	const srcVertexCount = getPrimitiveVertexCount(prim, VertexCountMethod.UPLOAD);

	unwrapPrimitives([prim], { watlas, overwrite: true });

	const dstVertexCount = getPrimitiveVertexCount(prim, VertexCountMethod.UPLOAD);

	t.is(srcVertexCount, 63, 'src.count = 63');
	t.true(dstVertexCount > 100 && dstVertexCount < 150, '100 < src.count < 150');
	t.is(getPrimitiveVertexCount(prim, VertexCountMethod.UNUSED), 0, 'no unused vertices');
});

test('unwrapPrimitives - texcoord', async (t) => {
	const document = new Document().setLogger(logger);
	const prim = createTorusKnotPrimitive(document, { tubularSegments: 6 });

	t.truthy(prim.getAttribute('TEXCOORD_0'), 'TEXCOORD_0 = A (initial)');
	t.is(prim.getAttribute('TEXCOORD_1'), null, 'TEXCOORD_1 = null (initial)');
	t.is(prim.getAttribute('TEXCOORD_3'), null, 'TEXCOORD_0 = null (initial)');

	unwrapPrimitives([prim], { watlas, texcoord: 1 });

	t.truthy(prim.getAttribute('TEXCOORD_0'), 'TEXCOORD_0 = A');
	t.truthy(prim.getAttribute('TEXCOORD_1'), 'TEXCOORD_1 = B');
	t.is(prim.getAttribute('TEXCOORD_3'), null, 'TEXCOORD_0 = null');
	t.notDeepEqual(prim.getAttribute('TEXCOORD_0'), prim.getAttribute('TEXCOORD_1'), 'A != B');

	unwrapPrimitives([prim], { watlas, texcoord: 2 });

	t.truthy(prim.getAttribute('TEXCOORD_0'), 'TEXCOORD_0 = A');
	t.truthy(prim.getAttribute('TEXCOORD_1'), 'TEXCOORD_1 = B');
	t.truthy(prim.getAttribute('TEXCOORD_2'), 'TEXCOORD_2 = C');
	t.notDeepEqual(prim.getAttribute('TEXCOORD_0'), prim.getAttribute('TEXCOORD_1'), 'A != B');
	t.notDeepEqual(prim.getAttribute('TEXCOORD_1'), prim.getAttribute('TEXCOORD_2'), 'B != C');
});

test('unwrapPrimitives - overwrite', async (t) => {
	const document = new Document().setLogger(logger);
	const prim = createTorusKnotPrimitive(document, { tubularSegments: 6 });

	const texCoordA = prim.getAttribute('TEXCOORD_0');
	const texCoordB = texCoordA.clone();
	prim.setAttribute('TEXCOORD_1', texCoordB);

	scaleAccessor(texCoordA, 2);
	scaleAccessor(texCoordB, 0.5);

	const texCoordBoundsA = getTexCoordBounds(texCoordA);
	const texCoordBoundsB = getTexCoordBounds(texCoordB);
	const texCoordBoundsC = { min: [0, 0] as vec2, max: [1, 1] as vec2 };

	t.is(prim.getAttribute('TEXCOORD_0'), texCoordA, 'TEXCOORD_0 = A');
	t.is(prim.getAttribute('TEXCOORD_1'), texCoordB, 'TEXCOORD_1 = B');
	t.deepEqual(texCoordBoundsA, { min: [0, 0], max: [2, 2] }, 'TEXCOORD_0 bounds');
	t.deepEqual(texCoordBoundsB, { min: [0, 0], max: [0.5, 0.5] }, 'TEXCOORD_1 bounds');

	unwrapPrimitives([prim], { watlas, texcoord: 1, overwrite: false });

	t.is(prim.getAttribute('TEXCOORD_0'), texCoordA, 'TEXCOORD_0 = A');
	t.is(prim.getAttribute('TEXCOORD_1'), texCoordB, 'TEXCOORD_1 = B');
	t.deepEqual(getTexCoordBounds(prim.getAttribute('TEXCOORD_0')), texCoordBoundsA, 'TEXCOORD_0 = A');
	t.deepEqual(getTexCoordBounds(prim.getAttribute('TEXCOORD_1')), texCoordBoundsB, 'TEXCOORD_1 = B');

	unwrapPrimitives([prim], { watlas, texcoord: 1, overwrite: true });

	// accessors may be replaced, and vertices reordered, but UV layout is the same.
	t.deepEqual(getTexCoordBounds(prim.getAttribute('TEXCOORD_0')), texCoordBoundsA, 'TEXCOORD_0 = A');
	t.deepEqual(getTexCoordBounds(prim.getAttribute('TEXCOORD_1')), texCoordBoundsC, 'TEXCOORD_1 = C');
});

test('unwrap - primitive', async (t) => {
	const document = new Document().setLogger(logger);

	const primA = createTorusKnotPrimitive(document, { tubularSegments: 6 });
	const primB = createTorusKnotPrimitive(document, { tubularSegments: 7 });
	const primC = createTorusKnotPrimitive(document, { tubularSegments: 8 });
	const meshA = document.createMesh('A').addPrimitive(primA).addPrimitive(primB);
	const meshB = document.createMesh('B').addPrimitive(primC);
	const nodeA = document.createNode('A').setMesh(meshA);
	const nodeB = document.createNode('B').setMesh(meshB);
	document.createScene().addChild(nodeA).addChild(nodeB);

	scaleAccessor(primA.getAttribute('POSITION'), 10);
	scaleAccessor(primB.getAttribute('POSITION'), 5);
	scaleAccessor(primC.getAttribute('POSITION'), 0.5);

	primA.setAttribute('TEXCOORD_0', null);
	primB.setAttribute('TEXCOORD_0', null);
	primC.setAttribute('TEXCOORD_0', null);

	await document.transform(unwrap({ watlas, groupBy: 'primitive', overwrite: true }));

	const areaA = getTexCoordArea(primA, 0);
	const areaB = getTexCoordArea(primB, 0);
	const areaC = getTexCoordArea(primC, 0);

	t.true(areaA > 0.4 && areaA < 0.6, '0.4 < areaA < 0.6');
	t.true(areaB > 0.4 && areaB < 0.6, '0.4 < areaB < 0.6');
	t.true(areaC > 0.4 && areaC < 0.6, '0.4 < areaC < 0.6');
});

test('unwrap - mesh', async (t) => {
	const document = new Document().setLogger(logger);

	const primA = createTorusKnotPrimitive(document, { tubularSegments: 6 });
	const primB = createTorusKnotPrimitive(document, { tubularSegments: 7 });
	const primC = createTorusKnotPrimitive(document, { tubularSegments: 8 });
	const meshA = document.createMesh('A').addPrimitive(primA).addPrimitive(primB);
	const meshB = document.createMesh('B').addPrimitive(primC);
	const nodeA = document.createNode('A').setMesh(meshA);
	const nodeB = document.createNode('B').setMesh(meshB);
	document.createScene().addChild(nodeA).addChild(nodeB);

	scaleAccessor(primA.getAttribute('POSITION'), 10);
	scaleAccessor(primB.getAttribute('POSITION'), 5);
	scaleAccessor(primC.getAttribute('POSITION'), 0.5);

	primA.setAttribute('TEXCOORD_0', null);
	primB.setAttribute('TEXCOORD_0', null);
	primC.setAttribute('TEXCOORD_0', null);

	await document.transform(unwrap({ watlas, groupBy: 'mesh', overwrite: true }));

	const areaA = getTexCoordArea(primA, 0);
	const areaB = getTexCoordArea(primB, 0);
	const areaC = getTexCoordArea(primC, 0);

	t.true(areaA > 0.3 && areaA < 0.5, '0.3 < areaA < 0.5');
	t.true(areaB > 0.05 && areaB < 0.2, '0.05 < areaB < 0.2');
	t.true(areaC > 0.4 && areaC < 0.6, '0.4 < areaC < 0.6');
});

test('unwrap - scene', async (t) => {
	const document = new Document().setLogger(logger);

	const primA = createTorusKnotPrimitive(document, { tubularSegments: 6 });
	const primB = createTorusKnotPrimitive(document, { tubularSegments: 7 });
	const primC = createTorusKnotPrimitive(document, { tubularSegments: 8 });
	const meshA = document.createMesh('A').addPrimitive(primA).addPrimitive(primB);
	const meshB = document.createMesh('B').addPrimitive(primC);
	const nodeA = document.createNode('A').setMesh(meshA);
	const nodeB = document.createNode('B').setMesh(meshB);
	document.createScene().addChild(nodeA).addChild(nodeB);

	scaleAccessor(primA.getAttribute('POSITION'), 10);
	scaleAccessor(primB.getAttribute('POSITION'), 5);
	scaleAccessor(primC.getAttribute('POSITION'), 0.5);

	primA.setAttribute('TEXCOORD_0', null);
	primB.setAttribute('TEXCOORD_0', null);
	primC.setAttribute('TEXCOORD_0', null);

	await document.transform(unwrap({ watlas, groupBy: 'scene', overwrite: true }));

	const areaA = getTexCoordArea(primA, 0);
	const areaB = getTexCoordArea(primB, 0);
	const areaC = getTexCoordArea(primC, 0);

	t.true(areaA > 0.3 && areaA < 0.5, '0.3 < areaA < 0.5');
	t.true(areaB > 0.05 && areaB < 0.2, '0.05 < areaB < 0.2');
	t.true(areaC > 0.0 && areaC < 0.01, '0.0 < areaC < 0.01');
});

// TODO(test): Unskip test.
test.skip('unwrap - scene scaled', async (t) => {
	const document = new Document().setLogger(logger);

	const primA = createTorusKnotPrimitive(document, { tubularSegments: 6 });
	const primB = createTorusKnotPrimitive(document, { tubularSegments: 7 });
	const primC = createTorusKnotPrimitive(document, { tubularSegments: 8 });
	const meshA = document.createMesh('A').addPrimitive(primA).addPrimitive(primB);
	const meshB = document.createMesh('B').addPrimitive(primC);
	const nodeA = document.createNode('A').setMesh(meshA);
	const nodeB = document.createNode('B').setMesh(meshB);
	document.createScene().addChild(nodeA).addChild(nodeB);

	nodeA.setScale([10, 10, 10]);
	nodeB.setScale([0.5, 0.5, 0.5]);

	primA.setAttribute('TEXCOORD_0', null);
	primB.setAttribute('TEXCOORD_0', null);
	primC.setAttribute('TEXCOORD_0', null);

	await document.transform(unwrap({ watlas, groupBy: 'scene', overwrite: true }));

	const areaA = getTexCoordArea(primA, 0);
	const areaB = getTexCoordArea(primB, 0);
	const areaC = getTexCoordArea(primC, 0);

	// TODO: Estimates only, update when un-skipping test.
	t.true(areaA > 0.2 && areaA < 0.3, '0.2 < areaA < 0.3');
	t.true(areaB > 0.2 && areaB < 0.3, '0.2 < areaB < 0.3');
	t.true(areaC > 0.0 && areaC < 0.01, '0.0 < areaC < 0.01');
});

/* UTILITIES */

function scaleAccessor(attribute: Accessor, scale: number): void {
	for (let i = 0, el = [], il = attribute.getCount(); i < il; i++) {
		attribute.getElement(i, el);
		for (let j = 0; j < el.length; j++) el[j] *= scale;
		attribute.setElement(i, el);
	}
}

function getTexCoordBounds(attribute: Accessor): { min: vec2; max: vec2 } {
	const bounds = { min: [Infinity, Infinity] as vec2, max: [-Infinity, -Infinity] as vec2 };

	const el: vec2 = [0, 0];
	for (let i = 0, il = attribute.getCount(); i < il; i++) {
		attribute.getElement(i, el);
		bounds.min[0] = Math.min(bounds.min[0], el[0]);
		bounds.min[1] = Math.min(bounds.min[1], el[1]);
		bounds.max[0] = Math.max(bounds.max[0], el[0]);
		bounds.max[1] = Math.max(bounds.max[1], el[1]);
	}

	return {
		min: bounds.min.map((v) => Math.round(v * 1000) / 1000) as vec2,
		max: bounds.max.map((v) => Math.round(v * 1000) / 1000) as vec2,
	};
}

function getTexCoordArea(prim: Primitive, index: number): number {
	const uv = prim.getAttribute(`TEXCOORD_${index}`)!;
	const indices = prim.getIndices()!;

	const a: vec2 = [0, 0];
	const b: vec2 = [0, 0];
	const c: vec2 = [0, 0];

	let area = 0;

	for (let i = 0, il = indices.getCount(); i < il; i += 3) {
		uv.getElement(indices.getScalar(i), a);
		uv.getElement(indices.getScalar(i + 1), b);
		uv.getElement(indices.getScalar(i + 2), c);
		area += Math.abs(0.5 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1])));
	}

	return area;
}
