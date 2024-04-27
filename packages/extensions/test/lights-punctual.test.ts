import test from 'ava';
import { Document, NodeIO } from '@gltf-transform/core';
import { Light, KHRLightsPunctual } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';

const WRITER_OPTIONS = { basename: 'extensionTest' };

test('basic', async (t) => {
	const document = new Document();
	const lightsExtension = document.createExtension(KHRLightsPunctual);
	const light = lightsExtension
		.createLight()
		.setType(Light.Type.SPOT)
		.setIntensity(2.0)
		.setColor([1, 2, 0])
		.setRange(50)
		.setInnerConeAngle(0.5)
		.setOuterConeAngle(0.75);

	const node = document.createNode().setExtension('KHR_lights_punctual', light);

	t.is(node.getExtension('KHR_lights_punctual'), light, 'light is attached');

	const jsonDoc = await new NodeIO().registerExtensions([KHRLightsPunctual]).writeJSON(document, WRITER_OPTIONS);
	const nodeDef = jsonDoc.json.nodes[0];

	t.deepEqual(nodeDef.extensions, { KHR_lights_punctual: { light: 0 } }, 'attaches light');
	t.deepEqual(jsonDoc.json.extensions, {
		KHR_lights_punctual: {
			lights: [
				{
					type: Light.Type.SPOT,
					intensity: 2,
					color: [1, 2, 0],
					range: 50,
					spot: {
						innerConeAngle: 0.5,
						outerConeAngle: 0.75,
					},
				},
			],
		},
	});

	lightsExtension.dispose();
	t.is(node.getExtension('KHR_lights_punctual'), null, 'light is detached');

	const roundtripDoc = await new NodeIO().registerExtensions([KHRLightsPunctual]).readJSON(jsonDoc);
	const roundtripNode = roundtripDoc.getRoot().listNodes().pop();
	const light2 = roundtripNode.getExtension<Light>('KHR_lights_punctual');

	t.is(light2.getType(), Light.Type.SPOT, 'reads type');
	t.is(light2.getIntensity(), 2, 'reads intensity');
	t.deepEqual(light2.getColor(), [1, 2, 0], 'reads color');
	t.is(light2.getRange(), 50, 'reads range');
	t.is(light2.getInnerConeAngle(), 0.5, 'reads innerConeAngle');
	t.is(light2.getOuterConeAngle(), 0.75, 'reads outerConeAngle');
});

test('copy', (t) => {
	const document = new Document();
	const lightsExtension = document.createExtension(KHRLightsPunctual);
	const light = lightsExtension
		.createLight()
		.setType(Light.Type.SPOT)
		.setIntensity(2.0)
		.setColor([1, 2, 0])
		.setRange(50)
		.setInnerConeAngle(0.5)
		.setOuterConeAngle(0.75);
	document.createNode().setExtension('KHR_lights_punctual', light);

	const doc2 = cloneDocument(document);
	const light2 = doc2.getRoot().listNodes()[0].getExtension<Light>('KHR_lights_punctual');
	t.is(doc2.getRoot().listExtensionsUsed().length, 1, 'copy KHRLightsPunctual');
	t.truthy(light2, 'copy light');
	t.is(light2.getType(), Light.Type.SPOT, 'copy type');
	t.is(light2.getIntensity(), 2, 'copy intensity');
	t.deepEqual(light2.getColor(), [1, 2, 0], 'copy color');
	t.is(light2.getRange(), 50, 'copy range');
	t.is(light2.getInnerConeAngle(), 0.5, 'copy innerConeAngle');
	t.is(light2.getOuterConeAngle(), 0.75, 'copy outerConeAngle');
});

test('i/o', async (t) => {
	const document = new Document();
	const lightsExtension = document.createExtension(KHRLightsPunctual);
	const light = lightsExtension.createLight().setType(Light.Type.POINT).setIntensity(2.0);

	const node = document.createNode().setExtension('KHR_lights_punctual', light);

	t.is(node.getExtension('KHR_lights_punctual'), light, 'light is attached');

	const jsonDoc = await new NodeIO().registerExtensions([KHRLightsPunctual]).writeJSON(document, WRITER_OPTIONS);
	const nodeDef = jsonDoc.json.nodes[0];

	t.deepEqual(nodeDef.extensions, { KHR_lights_punctual: { light: 0 } }, 'attaches light');
	t.deepEqual(jsonDoc.json.extensions, {
		KHR_lights_punctual: {
			lights: [{ type: 'point', intensity: 2 }], // omit range!
		},
	});
});
