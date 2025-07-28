import { Document } from '@gltf-transform/core';
import { KHRLightsPunctual, Light as LightDef } from '@gltf-transform/extensions';
import { DocumentView, NullImageProvider } from '@gltf-transform/view';
import test from 'ava';
import { JSDOM } from 'jsdom';
import type { DirectionalLight, Object3D, PointLight, SpotLight } from 'three';

global.document = new JSDOM().window.document;
const imageProvider = new NullImageProvider();

test('LightSubject | point', async (t) => {
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

	t.is(light.name, 'MyLight', 'node → light → name');
	t.is(light.type, 'PointLight', 'node → light → type');
	t.deepEqual(light.position.toArray(), [0, 0, 0], 'node → light → position');
	t.is(light.intensity, 2000, 'node → light → intensity');
	t.is(light.distance, 100, 'node → light → range');
	t.deepEqual(light.color.toArray(), [1, 0, 0], 'node → light → color');
	t.is(light.decay, 2, 'node → light → decay');
});

test('LightSubject | spot', async (t) => {
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

	t.is(light.name, 'MyLight', 'node → light → name');
	t.is(light.type, 'SpotLight', 'node → light → type');
	t.deepEqual(light.position.toArray(), [0, 0, 0], 'node → light → position');
	t.is(light.intensity, 2000, 'node → light → intensity');
	t.is(light.distance, 0, 'node → light → range');
	t.is(light.angle, Math.PI / 2, 'node → light → angle');
	t.is(light.penumbra, 1.0 - Math.PI / 4 / (Math.PI / 2), 'node → light → penumbra');
	t.deepEqual(light.color.toArray(), [1, 1, 0], 'node → light → color');
	t.is(light.decay, 2, 'node → light → decay');
});

test('LightSubject | directional', async (t) => {
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

	t.is(light.name, 'MyLight', 'node → light → name');
	t.is(light.type, 'DirectionalLight', 'node → light → type');
	t.deepEqual(light.position.toArray(), [0, 0, 0], 'node → light → position');
	t.is(light.intensity, 1.5, 'node → light → intensity');
	t.deepEqual(light.color.toArray(), [1, 1, 1], 'node → light → color');
});

test('LightSubject | instances', async (t) => {
	const document = new Document();
	const lightExt = document.createExtension(KHRLightsPunctual);
	const lightDef = lightExt.createLight('MyLight').setColor([1, 1, 1]).setIntensity(2000).setType(LightDef.Type.SPOT);
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

	t.deepEqual(nodeA.rotation.toArray(), [-Math.PI, 0, -0, 'XYZ'], 'nodeA.rotation');
	t.deepEqual(nodeB.rotation.toArray(), [-Math.PI, 0, -Math.PI, 'XYZ'], 'nodeB.rotation');

	t.is(lightA.type, 'SpotLight', 'lightA.type');
	t.is(lightB.type, 'SpotLight', 'lightB.type');
	t.true(lightA !== lightB, 'lightA !== lightB');

	t.is(lightA.target.type, 'Object3D', 'lightA.target.type');
	t.is(lightB.target.type, 'Object3D', 'lightB.target.type');
	t.deepEqual([lightA.target.uuid], lightA.children.map(toUUID), 'lightA.children');
	t.deepEqual([lightB.target.uuid], lightB.children.map(toUUID), 'lightB.children');
	t.true(lightA.target !== lightB.target, 'lightA.target !== lightB.target');
});
