require('source-map-support').install();

const test = require('tape');
const { Document } = require('../../');

test('@gltf-transform/core::material', t => {
	const doc = new Document();

	const tex1 = doc.createTexture('tex1');
	const tex2 = doc.createTexture('tex2');
	const tex3 = doc.createTexture('tex3');

	const mat = doc.createMaterial('mat');

	const toType = (p) => p.propertyType;

	mat.setBaseColorTexture(tex1);
	t.equals(mat.getBaseColorTexture(), tex1, 'sets baseColorTexture');
	t.deepEqual(tex1.listParents().map(toType), ['Root', 'Material'], 'links baseColorTexture')

	mat.setNormalTexture(tex2);
	t.equals(mat.getNormalTexture(), tex2, 'sets normalTexture');
	t.deepEqual(tex1.listParents().map(toType), ['Root', 'Material'], 'links normalTexture')
	t.deepEqual(tex2.listParents().map(toType), ['Root', 'Material'], 'links normalTexture')

	mat.setBaseColorTexture(tex3);
	t.equals(mat.getBaseColorTexture(), tex3, 'overwrites baseColorTexture');
	t.deepEqual(tex1.listParents().map(toType), ['Root'], 'unlinks old baseColorTexture');
	t.deepEqual(tex3.listParents().map(toType), ['Root', 'Material'], 'links new baseColorTexture');

	mat.setBaseColorTexture(null);
	t.equals(mat.getBaseColorTexture(), null, 'deletes baseColorTexture');
	t.deepEqual(tex3.listParents().map(toType), ['Root'], 'unlinks old baseColorTexture');

	t.end();
});
