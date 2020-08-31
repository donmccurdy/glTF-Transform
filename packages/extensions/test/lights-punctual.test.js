require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');
const { Document, NodeIO } = require('@gltf-transform/core');
const { LightsPunctual, Light, LightType } = require('../');

const WRITER_OPTIONS = {basename: 'extensionTest'};

test('@gltf-transform/extensions::lights-punctual', t => {
	const doc = new Document();
	const lightsExtension = doc.createExtension(LightsPunctual);
	const light = lightsExtension.createLight()
		.setType(LightType.SPOT)
		.setIntensity(2.0)
		.setColor([1, 2, 0])
		.setRange(50)
		.setInnerConeAngle(0.5)
		.setOuterConeAngle(0.75)

	const node = doc.createNode().setExtension('KHR_lights_punctual', light);

	t.equal(node.getExtension('KHR_lights_punctual'), light, 'light is attached');

	const nativeDoc = new NodeIO(fs, path).createNativeDocument(doc, WRITER_OPTIONS);
	const nodeDef = nativeDoc.json.nodes[0];

	t.deepEqual(nodeDef.extensions, {KHR_lights_punctual: {light: 0}}, 'attaches light');
	t.deepEqual(nativeDoc.json.extensions, {KHR_lights_punctual:{
		lights: [{
			type: LightType.SPOT,
			intensity: 2,
			color: [1, 2, 0],
			range: 50,
			innerConeAngle: 0.5,
			outerConeAngle: 0.75,
		}]
	}})

	lightsExtension.dispose();
	t.equal(node.getExtension('KHR_lights_punctual'), null, 'light is detached');

	const roundtripDoc = new NodeIO(fs, path)
		.registerExtensions([LightsPunctual])
		.createDocument(nativeDoc);
	const roundtripNode = roundtripDoc.getRoot().listNodes().pop();
	const light2 = roundtripNode.getExtension('KHR_lights_punctual');

	t.equal(light2.getType(), LightType.SPOT, 'reads type');
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
		.setType(LightType.SPOT)
		.setIntensity(2.0)
		.setColor([1, 2, 0])
		.setRange(50)
		.setInnerConeAngle(0.5)
		.setOuterConeAngle(0.75)
	doc.createNode().setExtension('KHR_lights_punctual', light);

	const doc2 = doc.clone();
	const light2 = doc2.getRoot().listNodes()[0].getExtension('KHR_lights_punctual');
	t.equals(doc2.getRoot().listExtensionsUsed().length, 1, 'copy LightsPunctual');
	t.ok(light2, 'copy light');
	t.equal(light2.getType(), LightType.SPOT, 'copy type');
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
		.setColorHex(0x111111)
	t.equals(light.getColorHex(), 0x111111, 'colorHex');
	t.end();
});
