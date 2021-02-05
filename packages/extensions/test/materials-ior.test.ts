require('source-map-support').install();

import test from 'tape';
import { Document, NodeIO } from '@gltf-transform/core';
import { IOR, MaterialsIOR } from '../';

const WRITER_OPTIONS = {basename: 'extensionTest'};

test('@gltf-transform/extensions::materials-ior', t => {
	const doc = new Document();
	const iorExtension = doc.createExtension(MaterialsIOR);
	const ior = iorExtension.createIOR().setIOR(1.2);

	const mat = doc.createMaterial('MyMaterial')
		.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
		.setExtension('KHR_materials_ior', ior);

	t.equal(mat.getExtension('KHR_materials_ior'), ior, 'ior is attached');

	const jsonDoc = new NodeIO().writeJSON(doc, WRITER_OPTIONS);
	const materialDef = jsonDoc.json.materials[0];

	t.deepEqual(
		materialDef.pbrMetallicRoughness.baseColorFactor,
		[1.0, 0.5, 0.5, 1.0],
		'writes base color'
	);
	t.deepEqual(
		materialDef.extensions,
		{'KHR_materials_ior': {ior: 1.2, }},
		'writes ior extension'
	);
	t.deepEqual(
		jsonDoc.json.extensionsUsed,
		[MaterialsIOR.EXTENSION_NAME],
		'writes extensionsUsed'
	);

	iorExtension.dispose();
	t.equal(mat.getExtension('KHR_materials_ior'), null, 'ior is detached');

	const roundtripDoc = new NodeIO()
		.registerExtensions([MaterialsIOR])
		.readJSON(jsonDoc);
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();

	t.equal(roundtripMat.getExtension<IOR>('KHR_materials_ior').getIOR(), 1.2, 'reads ior');
	t.end();
});

test('@gltf-transform/extensions::materials-ior | copy', t => {
	const doc = new Document();
	const iorExtension = doc.createExtension(MaterialsIOR);
	const ior = iorExtension.createIOR().setIOR(1.2);
	doc.createMaterial().setExtension('KHR_materials_ior', ior);

	const doc2 = doc.clone();
	const ior2 = doc2.getRoot().listMaterials()[0].getExtension<IOR>('KHR_materials_ior');
	t.equals(doc2.getRoot().listExtensionsUsed().length, 1, 'copy MaterialsIOR');
	t.ok(ior2, 'copy IOR');
	t.equals(ior2.getIOR(), 1.2, 'copy ior');
	t.end();
});
