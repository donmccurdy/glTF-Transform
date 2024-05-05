import test from 'ava';
import { JSDOM } from 'jsdom';
import { Document } from '@gltf-transform/core';
import { Light as LightDef, KHRLightsPunctual } from '@gltf-transform/extensions';
import { DocumentView, NullImageProvider } from '@gltf-transform/view';
import { DirectionalLight, PointLight, SpotLight } from 'three';

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
