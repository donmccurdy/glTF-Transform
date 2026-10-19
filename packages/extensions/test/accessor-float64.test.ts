import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Accessor, Document, NodeIO } from '@gltf-transform/core';
import { KHRAccessorFloat64 } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';

const WRITER_OPTIONS = { basename: 'extensionTest' };

describe('extensions::KHRAccessorFloat64', () => {
	test('basic', async () => {
		const document = new Document();
		const io = new NodeIO().registerExtensions([KHRAccessorFloat64]);

		document.createExtension(KHRAccessorFloat64).setRequired(true);

		const buffer = document.createBuffer();
		const position = document
			.createAccessor()
			.setType('VEC3')
			.setArray(new Float64Array([0, 1, 2]))
			.setBuffer(buffer);
		const prim = document.createPrimitive().setAttribute('POSITION', position);
		document.createMesh().addPrimitive(prim);

		const jsonDoc = await io.writeJSON(document, WRITER_OPTIONS);
		deepEqual(jsonDoc.json.extensionsUsed, [KHRAccessorFloat64.EXTENSION_NAME], 'writes extensionsUsed');
		deepEqual(jsonDoc.json.extensionsRequired, [KHRAccessorFloat64.EXTENSION_NAME], 'writes extensionsRequired');

		const rtDocument = await io.readJSON(jsonDoc);

		const rtExtensions = rtDocument.getRoot().listExtensionsRequired();
		const rtExtension = rtExtensions.find((ext) => ext.extensionName === 'KHR_accessor_float64');
		ok(rtExtension, 'reads KHR_accessor_float64');

		const rtPrim = rtDocument.getRoot().listMeshes()[0].listPrimitives()[0];
		const rtAccessor = rtPrim.getAttribute('POSITION');

		strictEqual(rtAccessor.getComponentType(), Accessor.ComponentType.FLOAT64, 'componentType == FLOAT64');
		ok(rtAccessor.getArray() instanceof Float64Array, 'array instanceof Float64Array');
		deepEqual(Array.from(rtAccessor.getArray()), [0, 1, 2], 'array contents');
	});

	test('aligns float64 data to 8 bytes in GLB', async () => {
		const document = new Document();
		const io = new NodeIO().registerExtensions([KHRAccessorFloat64]);
		document.createExtension(KHRAccessorFloat64).setRequired(true);

		const buffer = document.createBuffer();
		const weights = document
			.createAccessor()
			.setType('SCALAR')
			.setArray(new Float32Array([1]))
			.setBuffer(buffer);
		const offsets = document
			.createAccessor()
			.setType('SCALAR')
			.setArray(new Float64Array([0.5, 1.5]))
			.setBuffer(buffer);
		const position = document
			.createAccessor()
			.setType('VEC3')
			.setArray(new Float64Array([0, 1, 2]))
			.setBuffer(buffer);
		const prim = document.createPrimitive().setAttribute('POSITION', position);
		document.createMesh().addPrimitive(prim);
		document.createAnimation().addSampler(document.createAnimationSampler().setInput(weights).setOutput(offsets));

		const glb = await io.writeBinary(document);
		const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
		const jsonLength = view.getUint32(12, true);
		const binStart = 12 + 8 + jsonLength + 8;
		strictEqual(binStart % 8, 0, 'BIN chunk data starts on an 8-byte boundary');

		const json = JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + jsonLength)));
		for (const accessorDef of json.accessors) {
			if (accessorDef.componentType !== Accessor.ComponentType.FLOAT64) continue;
			const bufferViewDef = json.bufferViews[accessorDef.bufferView];
			strictEqual(
				((bufferViewDef.byteOffset || 0) + (accessorDef.byteOffset || 0)) % 8,
				0,
				'float64 accessor starts on an 8-byte boundary',
			);
		}

		const rtDocument = await io.readBinary(glb);
		const rtPosition = rtDocument.getRoot().listMeshes()[0].listPrimitives()[0].getAttribute('POSITION');
		deepEqual(Array.from(rtPosition.getArray()), [0, 1, 2], 'round trip');
	});

	test('copy', () => {
		const document = new Document();
		document.createExtension(KHRAccessorFloat64).setRequired(true);

		strictEqual(cloneDocument(document).getRoot().listExtensionsUsed().length, 1, 'copy KHRAccessorFloat64');
	});
});
