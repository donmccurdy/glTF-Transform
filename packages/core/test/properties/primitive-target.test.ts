import { deepEqual, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, type Property } from '@gltf-transform/core';

const toType = (p: Property): string => p.propertyType;

describe('core::PrimitiveTarget', () => {
	test('basic', () => {
		const doc = new Document();
		const prim1 = doc.createPrimitiveTarget();
		const acc1 = doc.createAccessor('acc1');
		prim1.setAttribute('POSITION', acc1);
		const prim2 = prim1.clone();

		strictEqual(prim1.getAttribute('POSITION'), acc1, 'sets POSITION');
		strictEqual(prim2.getAttribute('POSITION'), acc1, 'sets POSITION');
		deepEqual(acc1.listParents().map(toType), ['Root', 'PrimitiveTarget', 'PrimitiveTarget'], 'links POSITION');

		prim1.setAttribute('POSITION', null);
		strictEqual(prim1.getAttribute('POSITION'), null, 'unsets POSITION');
		deepEqual(acc1.listParents().map(toType), ['Root', 'PrimitiveTarget'], 'unlinks POSITION');
	});
});
