require('source-map-support').install();

import test from 'tape';
import { Document, NodeIO } from '@gltf-transform/core';
import { MaterialsPBRSpecularGlossiness, PBRSpecularGlossiness } from '../';

const WRITER_OPTIONS = {basename: 'extensionTest'};

test('@gltf-transform/extensions::materials-pbr-specular-glossiness', t => {
	const doc = new Document();
	const specGlossExtension = doc.createExtension(MaterialsPBRSpecularGlossiness);
	const specGloss = specGlossExtension.createPBRSpecularGlossiness()
		.setDiffuseFactor([0.5, 0.5, 0.5, 0.9])
		.setSpecularFactor([0.9, 0.5, 0.8])
		.setGlossinessFactor(0.5)
		.setSpecularGlossinessTexture(doc.createTexture());

	const mat = doc.createMaterial('MyMaterial')
		.setExtension('KHR_materials_pbrSpecularGlossiness', specGloss);

	t.equal(
		mat.getExtension('KHR_materials_pbrSpecularGlossiness'),
		specGloss,
		'specGloss is attached'
	);

	const jsonDoc = new NodeIO().writeJSON(doc, WRITER_OPTIONS);
	const materialDef = jsonDoc.json.materials[0];

	t.deepEqual(materialDef.extensions, {'KHR_materials_pbrSpecularGlossiness': {
		diffuseFactor: [0.5, 0.5, 0.5, 0.9],
		specularFactor: [0.9, 0.5, 0.8],
		glossinessFactor: 0.5,
		specularGlossinessTexture: {index: 0, texCoord: 0},
	}}, 'writes specGloss extension');
	t.deepEqual(
		jsonDoc.json.extensionsUsed,
		[MaterialsPBRSpecularGlossiness.EXTENSION_NAME],
		'writes extensionsUsed'
	);

	specGlossExtension.dispose();
	t.equal(mat.getExtension('KHR_materials_pbrSpecularGlossiness'), null, 'specGloss is detached');

	const roundtripDoc = new NodeIO()
		.registerExtensions([MaterialsPBRSpecularGlossiness])
		.readJSON(jsonDoc);
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
	const roundtripExt
		= roundtripMat.getExtension<PBRSpecularGlossiness>('KHR_materials_pbrSpecularGlossiness');

	t.deepEqual(roundtripExt.getDiffuseFactor(), [0.5, 0.5, 0.5, 0.9], 'reads diffuseFactor');
	t.deepEqual(roundtripExt.getSpecularFactor(), [0.9, 0.5, 0.8], 'reads specularFactor');
	t.equal(roundtripExt.getGlossinessFactor(), 0.5, 'reads glossinessFactor');
	t.ok(roundtripExt.getSpecularGlossinessTexture(), 'reads specularGlossinessTexture');
	t.end();
});

test('@gltf-transform/extensions::materials-pbr-specular-glossiness | copy', t => {
	const doc = new Document();
	const specGlossExtension = doc.createExtension(MaterialsPBRSpecularGlossiness);
	const specGloss = specGlossExtension.createPBRSpecularGlossiness()
		.setDiffuseFactor([0.5, 0.5, 0.5, 0.9])
		.setSpecularFactor([0.9, 0.5, 0.8])
		.setGlossinessFactor(0.5)
		.setSpecularGlossinessTexture(doc.createTexture('specGloss'));
	doc.createMaterial()
		.setExtension('KHR_materials_pbrSpecularGlossiness', specGloss);

	const doc2 = doc.clone();
	const specGloss2 = doc2.getRoot().listMaterials()[0]
		.getExtension<PBRSpecularGlossiness>('KHR_materials_pbrSpecularGlossiness');
	t.equals(doc2.getRoot().listExtensionsUsed().length, 1, 'copy MaterialsPBRSpecularGlossiness');
	t.ok(specGloss2, 'copy PBRSpecularGlossiness');
	t.deepEqual(specGloss2.getDiffuseFactor(), [0.5, 0.5, 0.5, 0.9], 'copy diffuseFactor');
	t.deepEqual(specGloss2.getSpecularFactor(), [0.9, 0.5, 0.8], 'copy specularFactor');
	t.equals(specGloss2.getGlossinessFactor(), 0.5, 'copy glossinessFactor');
	t.equals(
		specGloss2.getSpecularGlossinessTexture().getName(),
		'specGloss',
		'copy specularGlossinessTexture'
	);
	t.end();
});

test('@gltf-transform/extensions::materials-pbr-specular-glossiness | hex', t => {
	const doc = new Document();
	const specGlossExtension = doc.createExtension(MaterialsPBRSpecularGlossiness);
	const specGloss = specGlossExtension.createPBRSpecularGlossiness()
		.setDiffuseHex(0x0000FF);
	t.equals(specGloss.getDiffuseHex(), 254, 'diffuseHex');
	t.end();
});
