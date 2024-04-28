import test from 'ava';
import { Document, NodeIO } from '@gltf-transform/core';
import { IOR, KHRMaterialsIOR } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';

const WRITER_OPTIONS = { basename: 'extensionTest' };

test('basic', async (t) => {
	const doc = new Document();
	const iorExtension = doc.createExtension(KHRMaterialsIOR);
	const ior = iorExtension.createIOR().setIOR(1.2);

	const mat = doc
		.createMaterial('MyMaterial')
		.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
		.setExtension('KHR_materials_ior', ior);

	t.is(mat.getExtension('KHR_materials_ior'), ior, 'ior is attached');

	const jsonDoc = await new NodeIO().registerExtensions([KHRMaterialsIOR]).writeJSON(doc, WRITER_OPTIONS);
	const materialDef = jsonDoc.json.materials[0];

	t.deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
	t.deepEqual(materialDef.extensions, { KHR_materials_ior: { ior: 1.2 } }, 'writes ior extension');
	t.deepEqual(jsonDoc.json.extensionsUsed, [KHRMaterialsIOR.EXTENSION_NAME], 'writes extensionsUsed');

	iorExtension.dispose();
	t.is(mat.getExtension('KHR_materials_ior'), null, 'ior is detached');

	const roundtripDoc = await new NodeIO().registerExtensions([KHRMaterialsIOR]).readJSON(jsonDoc);
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();

	t.is(roundtripMat.getExtension<IOR>('KHR_materials_ior').getIOR(), 1.2, 'reads ior');
});

test('copy', (t) => {
	const doc = new Document();
	const iorExtension = doc.createExtension(KHRMaterialsIOR);
	const ior = iorExtension.createIOR().setIOR(1.2);
	doc.createMaterial().setExtension('KHR_materials_ior', ior);

	const doc2 = cloneDocument(doc);
	const ior2 = doc2.getRoot().listMaterials()[0].getExtension<IOR>('KHR_materials_ior');
	t.is(doc2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsIOR');
	t.truthy(ior2, 'copy IOR');
	t.is(ior2.getIOR(), 1.2, 'copy ior');
});
