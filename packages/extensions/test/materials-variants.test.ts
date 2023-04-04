import test from 'ava';
import { Document, NodeIO } from '@gltf-transform/core';
import { MappingList, KHRMaterialsVariants } from '@gltf-transform/extensions';

test('basic', async (t) => {
	const doc = new Document();
	const variantsExtension = doc.createExtension(KHRMaterialsVariants);
	const var2 = variantsExtension.createVariant('Damaged1');
	const var3 = variantsExtension.createVariant('Damaged2');

	const mat1 = doc.createMaterial('Default').setRoughnessFactor(0.0);
	const mat2 = doc.createMaterial('Damaged1').setRoughnessFactor(0.5);
	const mat3 = doc.createMaterial('Damaged2').setRoughnessFactor(1.0);

	const mappingList = variantsExtension
		.createMappingList()
		.addMapping(variantsExtension.createMapping().setMaterial(mat2).addVariant(var2))
		.addMapping(variantsExtension.createMapping().setMaterial(mat3).addVariant(var3));

	doc.createMesh('Varies').addPrimitive(
		doc.createPrimitive().setMaterial(mat1).setExtension('KHR_materials_variants', mappingList)
	);
	doc.createMesh('Static').addPrimitive(doc.createPrimitive().setMaterial(mat1));

	//

	const io = new NodeIO().registerExtensions([KHRMaterialsVariants]);
	const rtDoc = await io.readJSON(await io.writeJSON(doc, {}));
	const rtPrim1 = rtDoc.getRoot().listMeshes()[0].listPrimitives()[0];
	const rtPrim2 = rtDoc.getRoot().listMeshes()[1].listPrimitives()[0];
	const rtMappingList = rtPrim1.getExtension<MappingList>('KHR_materials_variants');

	//

	t.deepEqual(
		doc
			.getRoot()
			.listExtensionsUsed()
			.map((e) => e.extensionName),
		['KHR_materials_variants'],
		'has extension'
	);
	t.truthy(rtPrim1.getExtension('KHR_materials_variants'));
	t.falsy(rtPrim2.getExtension('KHR_materials_variants'));
	t.is(rtPrim1.getMaterial().getRoughnessFactor(), 0.0, 'default material (1)');
	t.is(rtPrim2.getMaterial().getRoughnessFactor(), 0.0, 'default material (2)');
	t.deepEqual(
		rtMappingList.listMappings().map((mapping) => mapping.getMaterial().getName()),
		['Damaged1', 'Damaged2'],
		'mapping materials'
	);
	t.deepEqual(
		rtMappingList.listMappings().map((mapping) => mapping.listVariants().map((variant) => variant.getName())),
		[['Damaged1'], ['Damaged2']],
		'mapping variants'
	);

	//

	variantsExtension.dispose();

	t.deepEqual(doc.getRoot().listExtensionsUsed(), [], 'all extensions detached');
	t.is(mat1.getExtension('KHR_materials_variants'), null, 'unlit is detached');
});

test('copy', (t) => {
	const doc = new Document();
	const variantsExtension = doc.createExtension(KHRMaterialsVariants);
	const var1 = variantsExtension.createVariant('Dry');
	const var2 = variantsExtension.createVariant('Wet');

	const mat1 = doc.createMaterial('Dry').setRoughnessFactor(0.5);
	const mat2 = doc.createMaterial('Wet').setRoughnessFactor(1.0);

	const map1 = variantsExtension.createMapping().setMaterial(mat1).addVariant(var1);
	const map2 = variantsExtension.createMapping().setMaterial(mat2).addVariant(var2);

	const mappingList = variantsExtension.createMappingList().addMapping(map1).addMapping(map2);

	const cpVariant = variantsExtension.createVariant().copy(var1);
	const cpMapping = variantsExtension.createMapping().copy(mappingList.listMappings()[0]);
	const cpMappingList = variantsExtension.createMappingList().copy(mappingList);

	t.is(cpVariant.getName(), 'Dry', 'copy variant');
	t.is(cpMapping.getMaterial(), mat1, 'copy mapping - material');
	t.deepEqual(cpMapping.listVariants(), [var1], 'copy mapping - variant');
	t.deepEqual(cpMappingList.listMappings(), [map1, map2]);
});
