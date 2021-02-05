require('source-map-support').install();

import test from 'tape';
import { Document, NodeIO } from '@gltf-transform/core';
import { MaterialsSheen, Sheen } from '../';

const WRITER_OPTIONS = {basename: 'extensionTest'};

test('@gltf-transform/extensions::materials-sheen', t => {
	const doc = new Document();
	const sheenExtension = doc.createExtension(MaterialsSheen);
	const sheen = sheenExtension.createSheen()
		.setSheenColorFactor([0.9, 0.5, .8])
		.setSheenColorTexture(doc.createTexture());

	const mat = doc.createMaterial('MyMaterial')
		.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
		.setExtension('KHR_materials_sheen', sheen);

	t.equal(mat.getExtension('KHR_materials_sheen'), sheen, 'sheen is attached');

	const jsonDoc = new NodeIO().writeJSON(doc, WRITER_OPTIONS);
	const materialDef = jsonDoc.json.materials[0];

	t.deepEqual(
		materialDef.pbrMetallicRoughness.baseColorFactor,
		[1.0, 0.5, 0.5, 1.0],
		'writes base color'
	);
	t.deepEqual(materialDef.extensions, {'KHR_materials_sheen': {
		sheenColorFactor: [0.9, 0.5, 0.8],
		sheenRoughnessFactor: 0,
		sheenColorTexture: {index: 0, texCoord: 0},
	}}, 'writes sheen extension');
	t.deepEqual(
		jsonDoc.json.extensionsUsed,
		[MaterialsSheen.EXTENSION_NAME],
		'writes extensionsUsed'
	);

	sheenExtension.dispose();
	t.equal(mat.getExtension('KHR_materials_sheen'), null, 'sheen is detached');

	const roundtripDoc = new NodeIO()
		.registerExtensions([MaterialsSheen])
		.readJSON(jsonDoc);
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
	const roundtripExt = roundtripMat.getExtension<Sheen>('KHR_materials_sheen');

	t.deepEqual(roundtripExt.getSheenColorFactor(), [0.9, 0.5, 0.8], 'reads sheenColorFactor');
	t.ok(roundtripExt.getSheenColorTexture(), 'reads sheenColorTexture');
	t.end();
});

test('@gltf-transform/extensions::materials-sheen | copy', t => {
	const doc = new Document();
	const sheenExtension = doc.createExtension(MaterialsSheen);
	const sheen = sheenExtension.createSheen()
		.setSheenColorFactor([0.9, 0.5, 0.8])
		.setSheenColorTexture(doc.createTexture('sheen'));
	doc.createMaterial()
		.setExtension('KHR_materials_sheen', sheen);

	const doc2 = doc.clone();
	const sheen2 = doc2.getRoot().listMaterials()[0].getExtension<Sheen>('KHR_materials_sheen');
	t.equals(doc2.getRoot().listExtensionsUsed().length, 1, 'copy MaterialsSheen');
	t.ok(sheen2, 'copy Sheen');
	t.deepEquals(sheen2.getSheenColorFactor(), [0.9, 0.5, 0.8], 'copy sheenColorFactor');
	t.equals(sheen2.getSheenColorTexture().getName(), 'sheen', 'copy sheenColorTexture');
	t.end();
});


test('@gltf-transform/extensions::materials-sheen | hex', t => {
	const doc = new Document();
	const sheenExtension = doc.createExtension(MaterialsSheen);
	const sheen = sheenExtension.createSheen()
		.setSheenColorHex(0x252525);
	t.equals(sheen.getSheenColorHex(), 0x252525, 'sheenColorHex');
	t.end();
});
