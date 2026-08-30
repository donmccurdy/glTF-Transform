import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document } from '@gltf-transform/core';
import { KHRLightsPunctual, Light as LightDef } from '@gltf-transform/extensions';
import { DocumentView, NullImageProvider } from '@gltf-transform/view';
import { JSDOM } from 'jsdom';
import type { DirectionalLight, Object3D, PointLight, SpotLight } from 'three';

global.document = new JSDOM().window.document;
const imageProvider = new NullImageProvider();

describe('view::LightSubject', () => {
	test('point', async () => {
		const document = new Document();
		const lightExt = document.createExtension(KHRLightsPunctual);
		const lightDef = lightExt
			.createLight('MyLight')
			.setColor([1, 0, 0])
			.setIntensity(2000)
			.setRange(100)
			.setType(LightDef.Type.POINT);
		const nodeDef = document.createNode('Node').setExtension('KHR_lights_punctual', lightDef);

		const documentView = new DocumentView(document, { imageProvider });
		const node = documentView.view(nodeDef);
		const light = node.children[0] as PointLight;

		strictEqual(light.name, 'MyLight', 'node → light → name');
		strictEqual(light.type, 'PointLight', 'node → light → type');
		deepEqual(light.position.toArray(), [0, 0, 0], 'node → light → position');
		strictEqual(light.intensity, 2000, 'node → light → intensity');
		strictEqual(light.distance, 100, 'node → light → range');
		deepEqual(light.color.toArray(), [1, 0, 0], 'node → light → color');
		strictEqual(light.decay, 2, 'node → light → decay');
	});

	test('spot', async () => {
		const document = new Document();
		const lightExt = document.createExtension(KHRLightsPunctual);
		const lightDef = lightExt
			.createLight('MyLight')
			.setColor([1, 1, 0])
			.setIntensity(2000)
			.setRange(null)
			.setInnerConeAngle(Math.PI / 4)
			.setOuterConeAngle(Math.PI / 2)
			.setType(LightDef.Type.SPOT);
		const nodeDef = document.createNode('Node').setExtension('KHR_lights_punctual', lightDef);

		const documentView = new DocumentView(document, { imageProvider });
		const node = documentView.view(nodeDef);
		const light = node.children[0] as SpotLight;

		strictEqual(light.name, 'MyLight', 'node → light → name');
		strictEqual(light.type, 'SpotLight', 'node → light → type');
		deepEqual(light.position.toArray(), [0, 0, 0], 'node → light → position');
		strictEqual(light.intensity, 2000, 'node → light → intensity');
		strictEqual(light.distance, 0, 'node → light → range');
		strictEqual(light.angle, Math.PI / 2, 'node → light → angle');
		strictEqual(light.penumbra, 1.0 - Math.PI / 4 / (Math.PI / 2), 'node → light → penumbra');
		deepEqual(light.color.toArray(), [1, 1, 0], 'node → light → color');
		strictEqual(light.decay, 2, 'node → light → decay');
	});

	test('directional', async () => {
		const document = new Document();
		const lightExt = document.createExtension(KHRLightsPunctual);
		const lightDef = lightExt
			.createLight('MyLight')
			.setColor([1, 1, 1])
			.setIntensity(1.5)
			.setType(LightDef.Type.DIRECTIONAL);
		const nodeDef = document.createNode('Node').setExtension('KHR_lights_punctual', lightDef);

		const documentView = new DocumentView(document, { imageProvider });
		const node = documentView.view(nodeDef);
		const light = node.children[0] as DirectionalLight;

		strictEqual(light.name, 'MyLight', 'node → light → name');
		strictEqual(light.type, 'DirectionalLight', 'node → light → type');
		deepEqual(light.position.toArray(), [0, 0, 0], 'node → light → position');
		strictEqual(light.intensity, 1.5, 'node → light → intensity');
		deepEqual(light.color.toArray(), [1, 1, 1], 'node → light → color');
	});

	test('instances', async () => {
		const document = new Document();
		const lightExt = document.createExtension(KHRLightsPunctual);
		const lightDef = lightExt
			.createLight('MyLight')
			.setColor([1, 1, 1])
			.setIntensity(2000)
			.setType(LightDef.Type.SPOT);
		const nodeDefA = document
			.createNode('NodeA')
			.setRotation([1, 0, 0, 0])
			.setExtension('KHR_lights_punctual', lightDef);
		const nodeDefB = document
			.createNode('NodeA')
			.setRotation([0, 1, 0, 0])
			.setExtension('KHR_lights_punctual', lightDef);

		const documentView = new DocumentView(document, { imageProvider });
		const nodeA = documentView.view(nodeDefA);
		const nodeB = documentView.view(nodeDefB);
		const lightA = nodeA.children[0] as SpotLight;
		const lightB = nodeB.children[0] as SpotLight;

		const toUUID = (object: Object3D): string => object.uuid;

		deepEqual(nodeA.rotation.toArray(), [-Math.PI, 0, -0, 'XYZ'], 'nodeA.rotation');
		deepEqual(nodeB.rotation.toArray(), [-Math.PI, 0, -Math.PI, 'XYZ'], 'nodeB.rotation');

		strictEqual(lightA.type, 'SpotLight', 'lightA.type');
		strictEqual(lightB.type, 'SpotLight', 'lightB.type');
		ok(lightA !== lightB, 'lightA !== lightB');

		strictEqual(lightA.target.type, 'Object3D', 'lightA.target.type');
		strictEqual(lightB.target.type, 'Object3D', 'lightB.target.type');
		deepEqual([lightA.target.uuid], lightA.children.map(toUUID), 'lightA.children');
		deepEqual([lightB.target.uuid], lightB.children.map(toUUID), 'lightB.children');
		ok(lightA.target !== lightB.target, 'lightA.target !== lightB.target');
	});
});
