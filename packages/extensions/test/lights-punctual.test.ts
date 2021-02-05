require('source-map-support').install();

import test from 'tape';
import { Document, NodeIO } from '@gltf-transform/core';
import { Light, LightsPunctual } from '../';

const WRITER_OPTIONS = {basename: 'extensionTest'};

test('@gltf-transform/extensions::lights-punctual', t => {
	const doc = new Document();
	const lightsExtension = doc.createExtension(LightsPunctual);
	const light = lightsExtension.createLight()
		.setType(Light.Type.SPOT)
		.setIntensity(2.0)
		.setColor([1, 2, 0])
		.setRange(50)
		.setInnerConeAngle(0.5)
		.setOuterConeAngle(0.75);

	const node = doc.createNode().setExtension('KHR_lights_punctual', light);

	t.equal(node.getExtension('KHR_lights_punctual'), light, 'light is attached');

	const jsonDoc = new NodeIO().writeJSON(doc, WRITER_OPTIONS);
	const nodeDef = jsonDoc.json.nodes[0];

	t.deepEqual(nodeDef.extensions, {'KHR_lights_punctual': {light: 0}}, 'attaches light');
	t.deepEqual(jsonDoc.json.extensions, {'KHR_lights_punctual':{
		lights: [{
			type: Light.Type.SPOT,
			intensity: 2,
			color: [1, 2, 0],
			range: 50,
			innerConeAngle: 0.5,
			outerConeAngle: 0.75,
		}]
	}});

	lightsExtension.dispose();
	t.equal(node.getExtension('KHR_lights_punctual'), null, 'light is detached');

	const roundtripDoc = new NodeIO()
		.registerExtensions([LightsPunctual])
		.readJSON(jsonDoc);
	const roundtripNode = roundtripDoc.getRoot().listNodes().pop();
	const light2 = roundtripNode.getExtension<Light>('KHR_lights_punctual');

	t.equal(light2.getType(), Light.Type.SPOT, 'reads type');
	t.equal(light2.getIntensity(), 2, 'reads intensity');
	t.deepEqual(light2.getColor(), [1, 2, 0], 'reads color');
	t.equal(light2.getRange(), 50, 'reads range');
	t.equal(light2.getInnerConeAngle(), 0.5, 'reads innerConeAngle');
	t.equal(light2.getOuterConeAngle(), 0.75, 'reads outerConeAngle');
	t.end();
});

test('@gltf-transform/extensions::lights-punctual | copy', t => {
	const doc = new Document();
	const lightsExtension = doc.createExtension(LightsPunctual);
	const light = lightsExtension.createLight()
		.setType(Light.Type.SPOT)
		.setIntensity(2.0)
		.setColor([1, 2, 0])
		.setRange(50)
		.setInnerConeAngle(0.5)
		.setOuterConeAngle(0.75);
	doc.createNode().setExtension('KHR_lights_punctual', light);

	const doc2 = doc.clone();
	const light2 = doc2.getRoot().listNodes()[0].getExtension<Light>('KHR_lights_punctual');
	t.equals(doc2.getRoot().listExtensionsUsed().length, 1, 'copy LightsPunctual');
	t.ok(light2, 'copy light');
	t.equal(light2.getType(), Light.Type.SPOT, 'copy type');
	t.equal(light2.getIntensity(), 2, 'copy intensity');
	t.deepEqual(light2.getColor(), [1, 2, 0], 'copy color');
	t.equal(light2.getRange(), 50, 'copy range');
	t.equal(light2.getInnerConeAngle(), 0.5, 'copy innerConeAngle');
	t.equal(light2.getOuterConeAngle(), 0.75, 'copy outerConeAngle');
	t.end();
});

test('@gltf-transform/extensions::lights-punctual | hex', t => {
	const doc = new Document();
	const lightsExtension = doc.createExtension(LightsPunctual);
	const light = lightsExtension.createLight()
		.setColorHex(0x111111);
	t.equals(light.getColorHex(), 0x111111, 'colorHex');
	t.end();
});

test('@gltf-transform/extensions::lights-punctual | i/o', t => {
	const doc = new Document();
	const lightsExtension = doc.createExtension(LightsPunctual);
	const light = lightsExtension.createLight()
		.setType(Light.Type.POINT)
		.setIntensity(2.0);

	const node = doc.createNode().setExtension('KHR_lights_punctual', light);

	t.equal(node.getExtension('KHR_lights_punctual'), light, 'light is attached');

	const jsonDoc = new NodeIO().writeJSON(doc, WRITER_OPTIONS);
	const nodeDef = jsonDoc.json.nodes[0];

	t.deepEqual(nodeDef.extensions, {'KHR_lights_punctual': {light: 0}}, 'attaches light');
	t.deepEqual(jsonDoc.json.extensions, {'KHR_lights_punctual': {
		lights: [{type: 'point', intensity: 2}] // omit range!
	}});
	t.end();
});
