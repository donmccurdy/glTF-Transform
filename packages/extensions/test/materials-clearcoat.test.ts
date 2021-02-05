require('source-map-support').install();

import test from 'tape';
import { Document, NodeIO } from '@gltf-transform/core';
import { Clearcoat, MaterialsClearcoat } from '../';

const WRITER_OPTIONS = {basename: 'extensionTest'};

test('@gltf-transform/extensions::materials-clearcoat | factors', t => {
	const doc = new Document();
	const clearcoatExtension = doc.createExtension(MaterialsClearcoat);
	const clearcoat = clearcoatExtension.createClearcoat()
		.setClearcoatFactor(0.9)
		.setClearcoatRoughnessFactor(0.1);

	doc.createMaterial('MyClearcoatMaterial')
		.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
		.setExtension('KHR_materials_clearcoat', clearcoat);

	const io = new NodeIO().registerExtensions([MaterialsClearcoat]);
	const roundtripDoc = io.readJSON(io.writeJSON(doc, {isGLB: false}));
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
	const roundtripExt = roundtripMat.getExtension<Clearcoat>('KHR_materials_clearcoat');

	t.equal(roundtripExt.getClearcoatFactor(), 0.9, 'reads clearcoatFactor');
	t.equal(roundtripExt.getClearcoatRoughnessFactor(), 0.1, 'reads clearcoatFactor');
	t.end();
});

test('@gltf-transform/extensions::materials-clearcoat | textures', t => {
	const doc = new Document();
	const clearcoatExtension = doc.createExtension(MaterialsClearcoat);
	const clearcoat = clearcoatExtension.createClearcoat()
		.setClearcoatFactor(0.9)
		.setClearcoatTexture(doc.createTexture())
		.setClearcoatRoughnessTexture(doc.createTexture())
		.setClearcoatNormalTexture(doc.createTexture())
		.setClearcoatNormalScale(2.0)
		.setClearcoatRoughnessFactor(0.1);

	const mat = doc.createMaterial('MyClearcoatMaterial')
		.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
		.setExtension('KHR_materials_clearcoat', clearcoat);

	t.equal(mat.getExtension('KHR_materials_clearcoat'), clearcoat, 'clearcoat is attached');

	const jsonDoc = new NodeIO().writeJSON(doc, WRITER_OPTIONS);
	const materialDef = jsonDoc.json.materials[0];

	t.deepEqual(
		materialDef.pbrMetallicRoughness.baseColorFactor,
		[1.0, 0.5, 0.5, 1.0],
		'writes base color'
	);
	t.deepEqual(materialDef.extensions, {'KHR_materials_clearcoat': {
		clearcoatFactor: 0.9,
		clearcoatRoughnessFactor: 0.1,
		clearcoatTexture: {index: 0, texCoord: 0},
		clearcoatRoughnessTexture: {index: 1, texCoord: 0},
		clearcoatNormalTexture: {index: 2, texCoord: 0, scale: 2},
	}}, 'writes clearcoat extension');
	t.deepEqual(
		jsonDoc.json.extensionsUsed,
		[MaterialsClearcoat.EXTENSION_NAME],
		'writes extensionsUsed'
	);

	clearcoatExtension.dispose();
	t.equal(mat.getExtension('KHR_materials_clearcoat'), null, 'clearcoat is detached');

	const roundtripDoc = new NodeIO()
		.registerExtensions([MaterialsClearcoat])
		.readJSON(jsonDoc);
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
	const roundtripExt = roundtripMat.getExtension<Clearcoat>('KHR_materials_clearcoat');

	t.equal(roundtripExt.getClearcoatFactor(), 0.9, 'reads clearcoatFactor');
	t.equal(roundtripExt.getClearcoatRoughnessFactor(), 0.1, 'reads clearcoatFactor');
	t.ok(roundtripExt.getClearcoatTexture(), 'reads clearcoatTexture');
	t.ok(roundtripExt.getClearcoatRoughnessTexture(), 'reads clearcoatRoughnessTexture');
	t.ok(roundtripExt.getClearcoatNormalTexture(), 'reads clearcoatNormalTexture');
	t.equal(roundtripExt.getClearcoatNormalScale(), 2, 'reads clearcoatNormalScale');
	t.end();
});

test('@gltf-transform/extensions::materials-clearcoat | disabled', t => {
	const doc = new Document();
	doc.createExtension(MaterialsClearcoat);
	doc.createMaterial();

	const io = new NodeIO().registerExtensions([MaterialsClearcoat]);
	const roundtripDoc = io.readJSON(io.writeJSON(doc, {isGLB: false}));
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
	t.equals(
		roundtripMat.getExtension('KHR_materials_clearcoat'),
		null,
		'no effect when not attached'
	);
	t.end();
});

test('@gltf-transform/extensions::materials-clearcoat | copy', t => {
	const doc = new Document();
	const clearcoatExtension = doc.createExtension(MaterialsClearcoat);
	const clearcoat = clearcoatExtension.createClearcoat()
		.setClearcoatFactor(0.9)
		.setClearcoatRoughnessFactor(0.1)
		.setClearcoatNormalScale(0.5)
		.setClearcoatTexture(doc.createTexture('cc'))
		.setClearcoatRoughnessTexture(doc.createTexture('ccrough'))
		.setClearcoatNormalTexture(doc.createTexture('ccnormal'));
	doc.createMaterial()
		.setExtension('KHR_materials_clearcoat', clearcoat);

	const doc2 = doc.clone();
	const clearcoat2 = doc2.getRoot().listMaterials()[0]
		.getExtension<Clearcoat>('KHR_materials_clearcoat');
	t.equals(doc2.getRoot().listExtensionsUsed().length, 1, 'copy MaterialsClearcoat');
	t.ok(clearcoat2, 'copy Clearcoat');
	t.equals(clearcoat2.getClearcoatFactor(), 0.9, 'copy clearcoatFactor');
	t.equals(clearcoat2.getClearcoatRoughnessFactor(), 0.1, 'copy clearcoatFactor');
	t.equals(clearcoat2.getClearcoatNormalScale(), 0.5, 'copy clearcoatFactor');
	t.equals(clearcoat2.getClearcoatTexture().getName(), 'cc', 'copy clearcoatTexture');
	t.equals(
		clearcoat2.getClearcoatRoughnessTexture().getName(),
		'ccrough',
		'copy clearcoatRoughnessTexture'
	);
	t.equals(
		clearcoat2.getClearcoatNormalTexture().getName(),
		'ccnormal',
		'copy clearcoatNormalTexture'
	);
	t.end();
});
