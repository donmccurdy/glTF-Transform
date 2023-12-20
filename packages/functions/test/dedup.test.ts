import path, { dirname } from 'path';
import test from 'ava';
import { Document, NodeIO, Property, PropertyType } from '@gltf-transform/core';
import { dedup } from '@gltf-transform/functions';
import { KHRMaterialsTransmission } from '@gltf-transform/extensions';
import { fileURLToPath } from 'url';
import ndarray from 'ndarray';
import { savePixels } from 'ndarray-pixels';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('accessors - geometry', async (t) => {
	const io = new NodeIO();
	const document = await io.read(path.join(__dirname, 'in/many-cubes.gltf'));
	t.is(document.getRoot().listAccessors().length, 1503, 'begins with duplicate accessors');

	dedup({ propertyTypes: [PropertyType.TEXTURE] })(document);

	t.is(document.getRoot().listAccessors().length, 1503, 'has no effect when disabled');

	dedup()(document);

	t.is(document.getRoot().listAccessors().length, 3, 'prunes duplicate accessors');
});

test('accessors - animation', (t) => {
	const document = new Document();
	const a = document.createAccessor().setArray(new Float32Array([1, 2, 3]));
	const b = document.createAccessor().setArray(new Float32Array([4, 5, 6]));
	const sampler1 = document.createAnimationSampler().setInput(a).setOutput(b);
	const sampler2 = document.createAnimationSampler().setInput(a.clone()).setOutput(b.clone());
	const sampler3 = document.createAnimationSampler().setInput(a.clone()).setOutput(a.clone());
	const prim = document.createPrimitive().setAttribute('POSITION', a.clone());
	document.createMesh().addPrimitive(prim);
	document.createAnimation().addSampler(sampler1).addSampler(sampler2).addSampler(sampler3);

	t.is(document.getRoot().listAccessors().length, 7, 'begins with duplicate accessors');

	dedup({ propertyTypes: [PropertyType.TEXTURE] })(document);

	t.is(document.getRoot().listAccessors().length, 7, 'has no effect when disabled');

	dedup()(document);

	t.is(document.getRoot().listAccessors().length, 4, 'prunes duplicate accessors');
	t.truthy(sampler1.getInput() === a, 'sampler 1 input');
	t.truthy(sampler1.getOutput() === b, 'sampler 1 output');
	t.truthy(sampler2.getInput() === a, 'sampler 2 input');
	t.truthy(sampler2.getOutput() === b, 'sampler 2 output');
	t.truthy(sampler3.getInput() === a, 'sampler 3 input');
	t.truthy(sampler3.getOutput() !== b, 'no mixing input/output');
	t.truthy(sampler3.getOutput() !== b, 'no mixing input/output');
	t.truthy(prim.getAttribute('POSITION') !== a, 'no mixing sampler/attribute');
	t.truthy(prim.getAttribute('POSITION') !== b, 'no mixing sampler/attribute');
});

test('materials', (t) => {
	const document = new Document();
	const root = document.getRoot();

	const mat = document
		.createMaterial('MatA')
		.setBaseColorFactor([0.8, 0.8, 0.8, 1])
		.setAlpha(0.9)
		.setAlphaMode('OPAQUE');
	const matCloned = mat.clone();
	const matRenamed = mat.clone().setName('MatC');
	const matUnequal = mat.clone().setName('MatD').setAlphaMode('MASK');

	t.truthy(mat.equals(matCloned), 'material.equals(material.clone())');

	dedup({ propertyTypes: [] })(document);

	t.is(root.listMaterials().length, 4, 'no-op when disabled');

	dedup()(document);

	t.is(root.listMaterials().length, 2, 'removes all duplicate materials');
	t.falsy(mat.isDisposed(), 'base = ✓');
	t.truthy(matCloned.isDisposed(), 'cloned = ⨉');
	t.truthy(matRenamed.isDisposed(), 'renamed = ⨉');
	t.falsy(matUnequal.isDisposed(), 'unequal = ✓');
});

test('materials - animation', (t) => {
	const document = new Document();
	const root = document.getRoot();

	const matA = document
		.createMaterial('MatA')
		.setBaseColorFactor([0.8, 0.8, 0.8, 1])
		.setAlpha(0.9)
		.setAlphaMode('OPAQUE');
	const matB = matA.clone();
	const matC = matA.clone();
	const matD = matA.clone();

	const edgeC = document.getGraph().listChildEdges(matC)[0];
	edgeC.getAttributes().modifyChild = true; // monkeypatch, emulating KHR_animation_pointer.

	const edgeD = document.getGraph().listParentEdges(matD)[0];
	edgeD.getAttributes().modifyChild = true; // monkeypatch, emulating KHR_animation_pointer.

	dedup()(document);

	t.is(root.listMaterials().length, 3, 'removes duplicate materials');
	t.false(matA.isDisposed(), 'base = ✓');
	t.true(matB.isDisposed(), 'cloned = ⨉');
	t.false(matC.isDisposed(), 'animated TextureInfo = ✓');
	t.false(matD.isDisposed(), 'animated Material = ✓');
});

test('meshes', async (t) => {
	const io = new NodeIO();
	const document = await io.read(path.join(__dirname, 'in/many-cubes.gltf'));
	const root = document.getRoot();
	t.is(root.listMeshes().length, 501, 'begins with duplicate meshes');

	dedup({ propertyTypes: [PropertyType.ACCESSOR] })(document);

	t.is(root.listMeshes().length, 501, 'has no effect when disabled');

	// Put unique materials on two meshes to prevent merging.
	root.listMeshes()[0].listPrimitives()[0].setMaterial(document.createMaterial('A'));
	root.listMeshes()[1].listPrimitives()[0].setMaterial(document.createMaterial('B'));
	root.listMeshes()[2].listPrimitives()[0].setMaterial(document.createMaterial('C').setRoughnessFactor(0.5));

	dedup()(document);

	t.is(root.listMeshes().length, 3, 'prunes duplicate meshes');
});

test('skins', async (t) => {
	const document = new Document();
	const root = document.getRoot();
	const boneA = document.createNode('A');
	const boneB = document.createNode('B');
	document.createScene().addChild(boneA).addChild(boneB);
	const skinA = document.createSkin().addJoint(boneA).addJoint(boneB);
	const skinB = document.createSkin().addJoint(boneA).addJoint(boneB);
	const skinC = document.createSkin().addJoint(boneA);

	t.is(root.listSkins().length, 3, 'begins with duplicate skins');

	await document.transform(dedup({ propertyTypes: [PropertyType.MESH] }));

	t.is(root.listSkins().length, 3, 'has no effect if disabled');

	await document.transform(dedup({ propertyTypes: [PropertyType.SKIN] }));

	t.is(root.listSkins().length, 2, 'prunes duplicate skins');
	t.false(skinA.isDisposed(), 'keep skin A');
	t.true(skinB.isDisposed(), 'dispose skin B');
	t.false(skinC.isDisposed(), 'keep skin C');
});

test('textures', async (t) => {
	const document = new Document();
	const transmissionExt = document.createExtension(KHRMaterialsTransmission);

	const pixels = ndarray(new Uint8Array(100 * 50 * 4), [100, 50, 4]);
	const image = await savePixels(pixels, 'image/png');

	const tex1 = document.createTexture('copy 1').setMimeType('image/png').setImage(image);
	const tex2 = document.createTexture('copy 2').setMimeType('image/png').setImage(image.slice());

	const transmission = transmissionExt.createTransmission().setTransmissionTexture(tex2);
	const mat = document
		.createMaterial()
		.setBaseColorTexture(tex1)
		.setExtension('KHR_materials_transmission', transmission);

	t.is(document.getRoot().listTextures().length, 2, 'begins with duplicate textures');

	dedup({ propertyTypes: [PropertyType.ACCESSOR] })(document);

	t.is(document.getRoot().listTextures().length, 2, 'has no effect when disabled');

	dedup()(document);

	t.is(document.getRoot().listTextures().length, 1, 'prunes duplicate textures');
	t.is(mat.getBaseColorTexture(), tex1, 'retains baseColorTexture');
	t.is(transmission.getTransmissionTexture(), tex1, 'retains transmissionTexture');
});

test('unique names', async (t) => {
	const document = new Document();

	const matA = document.createMaterial('A').setBaseColorFactor([0.5, 0.5, 0.5, 1]);
	const matB = matA.clone().setName('B');
	const matC = matA.clone().setName('C').setBaseColorFactor([0.6, 0.6, 0.6, 1]);

	const positionA = document
		.createAccessor()
		.setType('VEC3')
		.setArray(new Float32Array([0, 0, 0]));
	const positionB = document
		.createAccessor()
		.setType('VEC3')
		.setArray(new Float32Array([1, 1, 1]));

	const primA = document.createPrimitive().setAttribute('POSITION', positionA);
	const primB = document.createPrimitive().setAttribute('POSITION', positionB);

	const meshA = document.createMesh('A').addPrimitive(primA);
	const meshB = document.createMesh('B').addPrimitive(primA);
	const meshC = document.createMesh('C').addPrimitive(primB);

	await document.transform(dedup({ keepUniqueNames: true }));

	t.deepEqual([matA, matB, matC].map(isDisposed), [false, false, false], 'materials - keep unique names');
	t.deepEqual([meshA, meshB, meshC].map(isDisposed), [false, false, false], 'meshes - keep unique names');

	await document.transform(dedup({ keepUniqueNames: false }));

	t.deepEqual([matA, matB, matC].map(isDisposed), [false, true, false], 'materials - discard unique names');
	t.deepEqual([meshA, meshB, meshC].map(isDisposed), [false, true, false], 'meshes - discard unique names');
});

const isDisposed = (prop: Property) => prop.isDisposed();
