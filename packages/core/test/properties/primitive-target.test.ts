import test from 'ava';
import { Document, Property } from '@gltf-transform/core';

const toType = (p: Property): string => p.propertyType;

test('basic', (t) => {
	const doc = new Document();
	const prim1 = doc.createPrimitiveTarget();
	const acc1 = doc.createAccessor('acc1');
	prim1.setAttribute('POSITION', acc1);
	const prim2 = prim1.clone();

	t.is(prim1.getAttribute('POSITION'), acc1, 'sets POSITION');
	t.is(prim2.getAttribute('POSITION'), acc1, 'sets POSITION');
	t.deepEqual(acc1.listParents().map(toType), ['Root', 'PrimitiveTarget', 'PrimitiveTarget'], 'links POSITION');

	prim1.setAttribute('POSITION', null);
	t.is(prim1.getAttribute('POSITION'), null, 'unsets POSITION');
	t.deepEqual(acc1.listParents().map(toType), ['Root', 'PrimitiveTarget'], 'unlinks POSITION');
});
