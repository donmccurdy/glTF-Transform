import test from 'ava';
import { Accessor, Document, PropertyType } from '@gltf-transform/core';
import { prune } from '@gltf-transform/functions';
import { logger } from '@gltf-transform/test-utils';
import ndarray from 'ndarray';
import { savePixels } from 'ndarray-pixels';

const PIXELS_SOLID = ndarray(new Uint8Array([128, 128, 192, 1]), [1, 1, 4]);
const PIXELS_NON_SOLID = ndarray(new Uint8Array([64, 64, 128, 1, 32, 32, 128, 1]), [1, 2, 4]);

test('properties', async (t) => {
	const doc = new Document().setLogger(logger);

	// Create used resources.
	const prim = doc.createPrimitive();
	const mesh = doc.createMesh().addPrimitive(prim);
	const node = doc.createNode().setMesh(mesh);
	const scene = doc.createScene().addChild(node);
	const chan = doc.createAnimationChannel().setTargetNode(node);
	const samp = doc.createAnimationSampler();
	const anim = doc.createAnimation().addChannel(chan).addSampler(samp);

	// Create unused resources.
	const mesh2 = doc.createMesh().addPrimitive(prim);
	const node2 = doc.createNode().setMesh(mesh2);
	const chan2 = doc.createAnimationChannel().setTargetNode(node2);
	const samp2 = doc.createAnimationSampler();
	const anim2 = doc.createAnimation().addChannel(chan2).addSampler(samp2);

	const mesh3 = doc.createMesh();
	const node3 = doc.createNode().setMesh(mesh3);
	scene.addChild(node3);

	await doc.transform(prune());

	t.false(scene.isDisposed(), 'referenced scene');
	t.false(mesh.isDisposed(), 'referenced mesh');
	t.false(node.isDisposed(), 'referenced node');
	t.false(anim.isDisposed(), 'referenced animation');
	t.false(samp.isDisposed(), 'referenced sampler');
	t.false(chan.isDisposed(), 'referenced channel');

	t.true(mesh2.isDisposed(), 'unreferenced mesh');
	t.true(node2.isDisposed(), 'unreferenced node');
	t.true(anim2.isDisposed(), 'unreferenced animation');
	t.true(samp2.isDisposed(), 'unreferenced sampler');
	t.true(chan2.isDisposed(), 'unreferenced channel');

	t.true(mesh3.isDisposed(), 'empty mesh');
});

test('leaf nodes', async (t) => {
	const document = new Document().setLogger(logger);

	const prim = document.createPrimitive();
	const mesh = document.createMesh().addPrimitive(prim);
	const skin = document.createSkin();
	const nodeC = document.createNode('C').setMesh(mesh);
	const nodeB = document.createNode('B').addChild(nodeC);
	const nodeA = document.createNode('A').addChild(nodeB).setSkin(skin);
	const scene = document.createScene().addChild(nodeA);

	await document.transform(prune({ keepLeaves: true }));

	t.falsy(scene.isDisposed(), 'scene in tree');
	t.falsy(nodeA.isDisposed(), 'nodeA in tree');
	t.falsy(nodeB.isDisposed(), 'nodeB in tree');
	t.falsy(nodeC.isDisposed(), 'nodeC in tree');
	t.falsy(mesh.isDisposed(), 'mesh in tree');
	t.falsy(skin.isDisposed(), 'skin in tree');

	mesh.dispose();
	await document.transform(prune());

	t.falsy(scene.isDisposed(), 'scene in tree');
	t.falsy(nodeA.isDisposed(), 'nodeA in tree');
	t.truthy(nodeB.isDisposed(), 'nodeB disposed');
	t.truthy(nodeC.isDisposed(), 'nodeC disposed');

	skin.dispose();
	await document.transform(prune({ keepLeaves: false, propertyTypes: [] }));

	t.falsy(scene.isDisposed(), 'scene in tree');
	t.falsy(nodeA.isDisposed(), 'nodeA disposed');

	await document.transform(prune({ keepLeaves: false, propertyTypes: [PropertyType.NODE] }));

	t.falsy(scene.isDisposed(), 'scene in tree');
	t.truthy(nodeA.isDisposed(), 'nodeA disposed');
});

test('attributes', async (t) => {
	const document = new Document().setLogger(logger);

	const position = document.createAccessor('POSITION');
	const tangent = document.createAccessor('TANGENT');
	const texcoord0 = document.createAccessor('TEXCOORD_0');
	const texcoord1 = document.createAccessor('TEXCOORD_1');
	const color0 = document.createAccessor('COLOR_0');
	const color1 = document.createAccessor('COLOR_1');
	const texture = document.createTexture();
	const material = document
		.createMaterial()
		.setRoughnessFactor(1)
		.setBaseColorTexture(texture)
		.setNormalTexture(texture);
	material.getBaseColorTextureInfo().setTexCoord(0);
	material.getNormalTextureInfo().setTexCoord(1);
	const prim = document
		.createPrimitive()
		.setMaterial(material)
		.setAttribute('POSITION', position)
		.setAttribute('TANGENT', tangent)
		.setAttribute('TEXCOORD_0', texcoord0)
		.setAttribute('TEXCOORD_1', texcoord1)
		.setAttribute('COLOR_0', color0)
		.setAttribute('COLOR_1', color1);
	document.createMesh().addPrimitive(prim);

	await document.transform(
		prune({
			propertyTypes: [PropertyType.ACCESSOR],
			keepAttributes: true,
		}),
	);

	t.deepEqual(
		[position, tangent, texcoord0, texcoord1, color0, color1].map((a) => a.isDisposed()),
		new Array(6).fill(false),
		'keeps required attributes (1/3)',
	);

	await document.transform(
		prune({
			propertyTypes: [PropertyType.ACCESSOR],
			keepAttributes: false,
		}),
	);

	t.deepEqual(
		[position, tangent, texcoord0, texcoord1, color0].map((a) => a.isDisposed()),
		new Array(5).fill(false),
		'keeps required attributes (2/3)',
	);
	t.is(color1.isDisposed(), true, 'discards COLOR_1');

	material.setNormalTexture(null);

	await document.transform(
		prune({
			propertyTypes: [PropertyType.ACCESSOR],
			keepAttributes: false,
		}),
	);

	t.deepEqual(
		[position, texcoord0, color0].map((a) => a.isDisposed()),
		[false, false, false],
		'keeps required attributes (3/3)',
	);
	t.deepEqual(
		[tangent, texcoord1].map((a) => a.isDisposed()),
		[true, true],
		'discards TANGENT, TEXCOORD_1',
	);
});

test('attributes - texcoords', async (t) => {
	const document = new Document().setLogger(logger);

	// Material.
	const texture1 = document.createTexture();
	const texture3 = document.createTexture();
	const material = document.createMaterial();
	material.setBaseColorTexture(texture1).getBaseColorTextureInfo().setTexCoord(1);
	material.setNormalTexture(texture3).getNormalTextureInfo().setTexCoord(3);

	// Primitives.
	const uvs: Accessor[] = [];
	const primA = document
		.createPrimitive()
		.setMaterial(material)
		.setAttribute('POSITION', document.createAccessor())
		.setAttribute('TEXCOORD_0', (uvs[0] = document.createAccessor())) // unused
		.setAttribute('TEXCOORD_1', (uvs[1] = document.createAccessor()))
		.setAttribute('TEXCOORD_2', (uvs[2] = document.createAccessor())) // unused
		.setAttribute('TEXCOORD_3', (uvs[3] = document.createAccessor()));
	const primB = primA
		.clone()
		.setAttribute('TEXCOORD_4', (uvs[4] = document.createAccessor())) // unused
		.setAttribute('TEXCOORD_5', (uvs[5] = document.createAccessor())); // unused
	document.createMesh().addPrimitive(primA).addPrimitive(primB);

	await document.transform(prune({ propertyTypes: [PropertyType.ACCESSOR] }));

	t.deepEqual(
		uvs.map((a) => a.isDisposed()),
		[false, false, false, false, false, false],
		'keeps all texcoords',
	);

	await document.transform(prune({ propertyTypes: [PropertyType.ACCESSOR], keepAttributes: false }));

	t.deepEqual(
		uvs.map((a) => a.isDisposed()),
		[true, false, true, false, true, true],
		'disposes TEXCOORD_0, TEXCOORD_2, TEXCOORD_4, and TEXCOORD_5',
	);

	t.true(primA.getAttribute('TEXCOORD_0') === uvs[1], 'primA.TEXCOORD_0');
	t.true(primA.getAttribute('TEXCOORD_1') === uvs[3], 'primA.TEXCOORD_1');
	t.true(primA.getAttribute('TEXCOORD_2') === null, 'primA.TEXCOORD_2 → null');
	t.true(primA.getAttribute('TEXCOORD_3') === null, 'primA.TEXCOORD_3 → null');

	t.true(primB.getAttribute('TEXCOORD_0') === uvs[1], 'primB.TEXCOORD_0');
	t.true(primB.getAttribute('TEXCOORD_1') === uvs[3], 'primB.TEXCOORD_1');
	t.true(primB.getAttribute('TEXCOORD_2') === null, 'primB.TEXCOORD_2 → null');
	t.true(primB.getAttribute('TEXCOORD_3') === null, 'primB.TEXCOORD_3 → null');
	t.true(primB.getAttribute('TEXCOORD_4') === null, 'primB.TEXCOORD_4 → null');
	t.true(primB.getAttribute('TEXCOORD_5') === null, 'primB.TEXCOORD_5 → null');

	t.is(material.getBaseColorTextureInfo().getTexCoord(), 0, 'material.baseColorTexture.texCoord = 0');
	t.is(material.getNormalTextureInfo().getTexCoord(), 1, 'material.normalTexture.texCoord → 1');
});

test('indices', async (t) => {
	const document = new Document().setLogger(logger);

	const indicesA = document
		.createAccessor()
		.setType('SCALAR')
		.setArray(new Uint16Array([0, 1, 2, 3, 4, 5, 6, 7, 8]));
	const indicesB = document
		.createAccessor()
		.setType('SCALAR')
		.setArray(new Uint16Array([0, 1, 2, 0, 3, 4]));
	// prettier-ignore
	const position = document.createAccessor()
		.setType('VEC3')
		.setArray(new Float32Array([
			0, 0, 0,
			0, 0, 1,
			0, 1, 0,
			1, 0, 0,
			0, 1, 1,
			1, 1, 0,
			1, 1, 1,
			0, 0, 0,
			0, 0, 0,
		]));
	const primA = document.createPrimitive().setIndices(indicesA).setAttribute('POSITION', position);
	const primB = document.createPrimitive().setIndices(indicesB).setAttribute('POSITION', position);
	const mesh = document.createMesh().addPrimitive(primA).addPrimitive(primB);

	await document.transform(
		prune({
			propertyTypes: [PropertyType.ACCESSOR],
			keepIndices: true,
		}),
	);

	t.is(primA.getIndices(), indicesA, 'no change (1/2)');
	t.is(primB.getIndices(), indicesB, 'no change (2/2)');

	await document.transform(
		prune({
			propertyTypes: [PropertyType.ACCESSOR],
			keepIndices: false,
		}),
	);

	t.is(primA.getIndices(), null, 'prune (1/2)');
	t.is(primB.getIndices(), indicesB, 'keep (2/2)');

	t.is(indicesA.isDisposed(), true, 'unused indices disposed');

	t.is(primA.isDisposed(), false, 'prim kept (1/2)');
	t.is(primB.isDisposed(), false, 'prim kept (2/2)');
	t.is(mesh.isDisposed(), false, 'mesh kept');
});

test('solid textures', async (t) => {
	const document = new Document().setLogger(logger);

	const textureNonSolid = document
		.createTexture()
		.setImage(await savePixels(PIXELS_NON_SOLID, 'image/png'))
		.setMimeType('image/png');
	const textureSolid = document
		.createTexture()
		.setImage(await savePixels(PIXELS_SOLID, 'image/png'))
		.setMimeType('image/png');
	const textureUnknown = document.createTexture().setImage(new Uint8Array(1)).setMimeType('image/png');
	const material = document
		.createMaterial()
		.setBaseColorTexture(textureNonSolid)
		.setMetallicRoughnessTexture(textureSolid)
		.setEmissiveTexture(textureUnknown);
	const prim = document.createPrimitive().setMaterial(material);
	const mesh = document.createMesh().addPrimitive(prim);
	const node = document.createNode('A').setMesh(mesh);
	document.createScene().addChild(node);

	await document.transform(prune({ keepSolidTextures: true }));

	t.false(textureSolid.isDisposed());
	t.false(textureNonSolid.isDisposed());
	t.false(textureUnknown.isDisposed());

	await document.transform(prune({ keepSolidTextures: false }));

	t.true(textureSolid.isDisposed());
	t.false(textureNonSolid.isDisposed());
	t.false(textureUnknown.isDisposed());

	t.deepEqual(material.getBaseColorFactor(), [1, 1, 1, 1], 'baseColorFactor');
	t.deepEqual(material.getEmissiveFactor(), [0, 0, 0], 'baseColorFactor');
	t.is(material.getRoughnessFactor().toFixed(2), '0.50', 'roughnessFactor');
	t.is(material.getMetallicFactor().toFixed(2), '0.75', 'metallicFactor');
	t.is(material.getMetallicRoughnessTexture(), null, 'metallicRoughnessTexture');
});
