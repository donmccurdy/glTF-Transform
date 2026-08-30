import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { type Accessor, Document, Primitive, PropertyType } from '@gltf-transform/core';
import { KHRMaterialsUnlit } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';
import { logger } from '@gltf-transform/test-utils';
import ndarray from 'ndarray';
import { savePixels } from 'ndarray-pixels';

const PIXELS_SOLID = ndarray(new Uint8Array([128, 128, 192, 1]), [1, 1, 4]);
const PIXELS_NON_SOLID = ndarray(new Uint8Array([64, 64, 128, 1, 32, 32, 128, 1]), [1, 2, 4]);

describe('functions::prune', () => {
	test('properties', async () => {
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

		strictEqual(scene.isDisposed(), false, 'referenced scene');
		strictEqual(mesh.isDisposed(), false, 'referenced mesh');
		strictEqual(node.isDisposed(), false, 'referenced node');
		strictEqual(anim.isDisposed(), false, 'referenced animation');
		strictEqual(samp.isDisposed(), false, 'referenced sampler');
		strictEqual(chan.isDisposed(), false, 'referenced channel');

		ok(mesh2.isDisposed(), 'unreferenced mesh');
		ok(node2.isDisposed(), 'unreferenced node');
		ok(anim2.isDisposed(), 'unreferenced animation');
		ok(samp2.isDisposed(), 'unreferenced sampler');
		ok(chan2.isDisposed(), 'unreferenced channel');

		ok(mesh3.isDisposed(), 'empty mesh');
	});

	test('leaf nodes', async () => {
		const document = new Document().setLogger(logger);

		const prim = document.createPrimitive();
		const mesh = document.createMesh().addPrimitive(prim);
		const skin = document.createSkin();
		const nodeC = document.createNode('C').setMesh(mesh);
		const nodeB = document.createNode('B').addChild(nodeC);
		const nodeA = document.createNode('A').addChild(nodeB).setSkin(skin);
		const scene = document.createScene().addChild(nodeA);

		await document.transform(prune({ keepLeaves: true }));

		strictEqual(scene.isDisposed(), false, 'scene in tree');
		strictEqual(nodeA.isDisposed(), false, 'nodeA in tree');
		strictEqual(nodeB.isDisposed(), false, 'nodeB in tree');
		strictEqual(nodeC.isDisposed(), false, 'nodeC in tree');
		strictEqual(mesh.isDisposed(), false, 'mesh in tree');
		strictEqual(skin.isDisposed(), false, 'skin in tree');

		mesh.dispose();
		await document.transform(prune());

		strictEqual(scene.isDisposed(), false, 'scene in tree');
		strictEqual(nodeA.isDisposed(), false, 'nodeA in tree');
		ok(nodeB.isDisposed(), 'nodeB disposed');
		ok(nodeC.isDisposed(), 'nodeC disposed');

		skin.dispose();
		await document.transform(prune({ keepLeaves: false, propertyTypes: [] }));

		strictEqual(scene.isDisposed(), false, 'scene in tree');
		strictEqual(nodeA.isDisposed(), false, 'nodeA disposed');

		await document.transform(prune({ keepLeaves: false, propertyTypes: [PropertyType.NODE] }));

		strictEqual(scene.isDisposed(), false, 'scene in tree');
		ok(nodeA.isDisposed(), 'nodeA disposed');
	});

	test('leaf nodes - extras', async () => {
		const document = new Document().setLogger(logger);
		const node = document.createNode('CustomNode');
		node.setExtras({ customData: 'test' });
		document.createScene().addChild(node);

		await document.transform(prune({ propertyTypes: [PropertyType.NODE], keepLeaves: false, keepExtras: true }));

		strictEqual(document.getRoot().listNodes().length, 1, '1 nodes');

		await document.transform(prune({ propertyTypes: [PropertyType.NODE], keepLeaves: false, keepExtras: false }));

		strictEqual(document.getRoot().listNodes().length, 0, '0 nodes');
	});

	test('attributes', async () => {
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

		deepEqual(
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

		deepEqual(
			[position, tangent, texcoord0, texcoord1, color0].map((a) => a.isDisposed()),
			new Array(5).fill(false),
			'keeps required attributes (2/3)',
		);
		strictEqual(color1.isDisposed(), true, 'discards COLOR_1');

		material.setNormalTexture(null);

		await document.transform(
			prune({
				propertyTypes: [PropertyType.ACCESSOR],
				keepAttributes: false,
			}),
		);

		deepEqual(
			[position, texcoord0, color0].map((a) => a.isDisposed()),
			[false, false, false],
			'keeps required attributes (3/3)',
		);
		deepEqual(
			[tangent, texcoord1].map((a) => a.isDisposed()),
			[true, true],
			'discards TANGENT, TEXCOORD_1',
		);
	});

	test('attributes - texcoords', async () => {
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

		await document.transform(prune({ keepAttributes: true, propertyTypes: [PropertyType.ACCESSOR] }));

		deepEqual(
			uvs.map((a) => a.isDisposed()),
			[false, false, false, false, false, false],
			'keeps all texcoords',
		);

		await document.transform(prune({ keepAttributes: false, propertyTypes: [PropertyType.ACCESSOR] }));

		deepEqual(
			uvs.map((a) => a.isDisposed()),
			[true, false, true, false, true, true],
			'disposes TEXCOORD_0, TEXCOORD_2, TEXCOORD_4, and TEXCOORD_5',
		);

		ok(primA.getAttribute('TEXCOORD_0') === uvs[1], 'primA.TEXCOORD_0');
		ok(primA.getAttribute('TEXCOORD_1') === uvs[3], 'primA.TEXCOORD_1');
		ok(primA.getAttribute('TEXCOORD_2') === null, 'primA.TEXCOORD_2 → null');
		ok(primA.getAttribute('TEXCOORD_3') === null, 'primA.TEXCOORD_3 → null');

		ok(primB.getAttribute('TEXCOORD_0') === uvs[1], 'primB.TEXCOORD_0');
		ok(primB.getAttribute('TEXCOORD_1') === uvs[3], 'primB.TEXCOORD_1');
		ok(primB.getAttribute('TEXCOORD_2') === null, 'primB.TEXCOORD_2 → null');
		ok(primB.getAttribute('TEXCOORD_3') === null, 'primB.TEXCOORD_3 → null');
		ok(primB.getAttribute('TEXCOORD_4') === null, 'primB.TEXCOORD_4 → null');
		ok(primB.getAttribute('TEXCOORD_5') === null, 'primB.TEXCOORD_5 → null');

		strictEqual(material.getBaseColorTextureInfo().getTexCoord(), 0, 'material.baseColorTexture.texCoord = 0');
		strictEqual(material.getNormalTextureInfo().getTexCoord(), 1, 'material.normalTexture.texCoord → 1');
	});

	test('attributes - normals', async () => {
		const document = new Document().setLogger(logger);

		const unlitExtension = document.createExtension<KHRMaterialsUnlit>(KHRMaterialsUnlit);
		const material = document.createMaterial();
		const materialUnlit = document
			.createMaterial()
			.setExtension('KHR_materials_unlit', unlitExtension.createUnlit());

		const attribute = document.createAccessor().setArray(new Float32Array(12));
		const primTriangles = document
			.createPrimitive()
			.setMaterial(material)
			.setAttribute('POSITION', attribute)
			.setAttribute('NORMAL', attribute)
			.setMode(Primitive.Mode.TRIANGLES);
		const primPoints = primTriangles.clone().setMode(Primitive.Mode.POINTS);
		const primUnlit = primTriangles.clone().setMaterial(materialUnlit);
		const mesh = document.createMesh().addPrimitive(primTriangles).addPrimitive(primPoints).addPrimitive(primUnlit);
		const node = document.createNode().setMesh(mesh);
		document.createScene().addChild(node);

		await document.transform(prune({ keepAttributes: true, propertyTypes: [PropertyType.ACCESSOR] }));

		deepEqual(primTriangles.listSemantics(), ['POSITION', 'NORMAL'], 'triangles, keepAttributes=true');
		deepEqual(primPoints.listSemantics(), ['POSITION', 'NORMAL'], 'points, keepAttributes=true');
		deepEqual(primUnlit.listSemantics(), ['POSITION', 'NORMAL'], 'unlit, keepAttributes=true');

		await document.transform(prune({ keepAttributes: false, propertyTypes: [PropertyType.ACCESSOR] }));

		deepEqual(primTriangles.listSemantics(), ['POSITION', 'NORMAL'], 'triangles, keepAttributes=false');
		deepEqual(primPoints.listSemantics(), ['POSITION'], 'points, keepAttributes=false');
		deepEqual(primUnlit.listSemantics(), ['POSITION'], 'unlit, keepAttributes=false');
	});

	test('solid textures', async () => {
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

		strictEqual(textureSolid.isDisposed(), false);
		strictEqual(textureNonSolid.isDisposed(), false);
		strictEqual(textureUnknown.isDisposed(), false);

		await document.transform(prune({ keepSolidTextures: false }));

		ok(textureSolid.isDisposed());
		strictEqual(textureNonSolid.isDisposed(), false);
		strictEqual(textureUnknown.isDisposed(), false);

		deepEqual(material.getBaseColorFactor(), [1, 1, 1, 1], 'baseColorFactor');
		deepEqual(material.getEmissiveFactor(), [0, 0, 0], 'baseColorFactor');
		strictEqual(material.getRoughnessFactor().toFixed(2), '0.50', 'roughnessFactor');
		strictEqual(material.getMetallicFactor().toFixed(2), '0.75', 'metallicFactor');
		strictEqual(material.getMetallicRoughnessTexture(), null, 'metallicRoughnessTexture');
	});
});
