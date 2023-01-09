require('source-map-support').install();

import test from 'tape';
import { Document, NodeIO } from '@gltf-transform/core';
import { EmissiveStrength, KHRMaterialsEmissiveStrength } from '../';

const WRITER_OPTIONS = { basename: 'extensionTest' };

test('@gltf-transform/extensions::materials-emissive-strength', async (t) => {
	const doc = new Document();
	const emissiveStrengthExtension = doc.createExtension(KHRMaterialsEmissiveStrength);
	const emissiveStrength = emissiveStrengthExtension.createEmissiveStrength().setEmissiveStrength(5.0);

	const mat = doc
		.createMaterial('MyMaterial')
		.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
		.setExtension('KHR_materials_emissive_strength', emissiveStrength);

	t.equal(mat.getExtension('KHR_materials_emissive_strength'), emissiveStrength, 'emissive strength is attached');

	const jsonDoc = await new NodeIO()
		.registerExtensions([KHRMaterialsEmissiveStrength])
		.writeJSON(doc, WRITER_OPTIONS);
	const materialDef = jsonDoc.json.materials[0];

	t.deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
	t.deepEqual(
		materialDef.extensions,
		{ KHR_materials_emissive_strength: { emissiveStrength: 5.0 } },
		'writes emissive strength extension'
	);
	t.deepEqual(jsonDoc.json.extensionsUsed, [KHRMaterialsEmissiveStrength.EXTENSION_NAME], 'writes extensionsUsed');

	emissiveStrengthExtension.dispose();
	t.equal(mat.getExtension('KHR_materials_emissive_strength'), null, 'emissive strength is detached');

	const roundtripDoc = await new NodeIO().registerExtensions([KHRMaterialsEmissiveStrength]).readJSON(jsonDoc);
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();

	t.equal(
		roundtripMat.getExtension<EmissiveStrength>('KHR_materials_emissive_strength').getEmissiveStrength(),
		5.0,
		'reads emissive strength'
	);
	t.end();
});

test('@gltf-transform/extensions::materials-emissive-strength | copy', (t) => {
	const doc = new Document();
	const emissiveStrengthExtension = doc.createExtension(KHRMaterialsEmissiveStrength);
	const emissiveStrength = emissiveStrengthExtension.createEmissiveStrength().setEmissiveStrength(5.0);
	doc.createMaterial().setExtension('KHR_materials_emissive_strength', emissiveStrength);

	const doc2 = doc.clone();
	const emissiveStrength2 = doc2
		.getRoot()
		.listMaterials()[0]
		.getExtension<EmissiveStrength>('KHR_materials_emissive_strength');
	t.equals(doc2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsEmissiveStrength');
	t.ok(emissiveStrength2, 'copy EmissiveStrength');
	t.equals(emissiveStrength2.getEmissiveStrength(), 5.0, 'copy emissive strength');
	t.end();
});
