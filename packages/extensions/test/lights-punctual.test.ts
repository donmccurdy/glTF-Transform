import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRLightsPunctual, Light } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';
import { createPlatformIO } from '@gltf-transform/test-utils';

const WRITER_OPTIONS = { basename: 'extensionTest' };

describe('extensions::KHRLightsPunctual', () => {
	test('basic', async () => {
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

		strictEqual(node.getExtension('KHR_lights_punctual'), light, 'light is attached');

		const jsonDoc = await new NodeIO().registerExtensions([KHRLightsPunctual]).writeJSON(document, WRITER_OPTIONS);
		const nodeDef = jsonDoc.json.nodes[0];

		deepEqual(nodeDef.extensions, { KHR_lights_punctual: { light: 0 } }, 'attaches light');
		deepEqual(jsonDoc.json.extensions, {
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
		strictEqual(node.getExtension('KHR_lights_punctual'), null, 'light is detached');

		const roundtripDoc = await new NodeIO().registerExtensions([KHRLightsPunctual]).readJSON(jsonDoc);
		const roundtripNode = roundtripDoc.getRoot().listNodes().pop();
		const light2 = roundtripNode.getExtension<Light>('KHR_lights_punctual');

		strictEqual(light2.getType(), Light.Type.SPOT, 'reads type');
		strictEqual(light2.getIntensity(), 2, 'reads intensity');
		deepEqual(light2.getColor(), [1, 2, 0], 'reads color');
		strictEqual(light2.getRange(), 50, 'reads range');
		strictEqual(light2.getInnerConeAngle(), 0.5, 'reads innerConeAngle');
		strictEqual(light2.getOuterConeAngle(), 0.75, 'reads outerConeAngle');
	});

	test('copy', () => {
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
		strictEqual(doc2.getRoot().listExtensionsUsed().length, 1, 'copy KHRLightsPunctual');
		ok(light2, 'copy light');
		strictEqual(light2.getType(), Light.Type.SPOT, 'copy type');
		strictEqual(light2.getIntensity(), 2, 'copy intensity');
		deepEqual(light2.getColor(), [1, 2, 0], 'copy color');
		strictEqual(light2.getRange(), 50, 'copy range');
		strictEqual(light2.getInnerConeAngle(), 0.5, 'copy innerConeAngle');
		strictEqual(light2.getOuterConeAngle(), 0.75, 'copy outerConeAngle');
	});

	test('i/o', async () => {
		const document = new Document();
		const io = await createPlatformIO();
		io.registerExtensions([KHRLightsPunctual]);

		const lightsExtension = document.createExtension(KHRLightsPunctual);
		const light = lightsExtension.createLight().setType(Light.Type.POINT).setIntensity(2.0);

		const node = document.createNode().setExtension('KHR_lights_punctual', light);

		strictEqual(node.getExtension('KHR_lights_punctual'), light, 'light is attached');

		const jsonDoc = await io.writeJSON(document, WRITER_OPTIONS);
		const nodeDef = jsonDoc.json.nodes[0];

		deepEqual(nodeDef.extensions, { KHR_lights_punctual: { light: 0 } }, 'attaches light');
		deepEqual(jsonDoc.json.extensions, {
			KHR_lights_punctual: {
				lights: [{ type: 'point', intensity: 2 }], // omit range!
			},
		});
	});

	test('extras', async () => {
		const document = new Document();
		const io = await createPlatformIO();
		io.registerExtensions([KHRLightsPunctual]);

		const lightsExtension = document.createExtension(KHRLightsPunctual);
		const light = lightsExtension.createLight().setExtras({ hello: 'world' });

		document.createNode().setExtension('KHR_lights_punctual', light);

		const jsonDoc = await io.writeJSON(document, WRITER_OPTIONS);
		const lightsExtensionDef = jsonDoc.json.extensions['KHR_lights_punctual'] as {
			lights: Record<string, unknown>[];
		};
		const lightDef = lightsExtensionDef.lights[0];

		deepEqual(lightDef.extras, { hello: 'world' }, 'writes light.extras');

		const rtDocument = await io.readJSON(jsonDoc);
		const rtLightsExtension = rtDocument.createExtension(KHRLightsPunctual);
		const rtLight = rtLightsExtension.listProperties()[0] as Light;

		deepEqual(rtLight.getExtras(), { hello: 'world' }, 'reads light.extras');
	});
});
