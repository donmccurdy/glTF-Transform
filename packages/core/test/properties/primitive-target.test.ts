require('source-map-support').install();

import test from 'tape';
import { Document, Property } from '../../';

const toType = (p: Property): string => p.propertyType;

test('@gltf-transform/core::primitive-target', t => {
	const doc = new Document();
	const prim1 = doc.createPrimitiveTarget();
	const acc1 = doc.createAccessor('acc1');
	prim1.setAttribute('POSITION', acc1);
	const prim2 = prim1.clone();

	t.equals(prim1.getAttribute('POSITION'), acc1, 'sets POSITION');
	t.equals(prim2.getAttribute('POSITION'), acc1, 'sets POSITION');
	t.deepEqual(
		acc1.listParents().map(toType),
		['Root', 'PrimitiveTarget', 'PrimitiveTarget'],
		'links POSITION'
	);

	prim1.setAttribute('POSITION', null);
	t.equals(prim1.getAttribute('POSITION'), null, 'unsets POSITION');
	t.deepEqual(acc1.listParents().map(toType), ['Root', 'PrimitiveTarget'], 'unlinks POSITION');
	t.end();
});
