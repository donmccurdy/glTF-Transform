import { deepEqual, strictEqual, throws } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Accessor, Document, type GLTF, type TypedArray } from '@gltf-transform/core';
import { createPlatformIO, round } from '@gltf-transform/test-utils';

const { FLOAT, UNSIGNED_BYTE, UNSIGNED_SHORT, UNSIGNED_INT, BYTE, SHORT } = Accessor.ComponentType;

describe('core::Accessor', () => {
	test('getScalar/setScalar', () => {
		const accessor = new Document()
			.createAccessor()
			.setArray(new Float32Array([1, 2, 3, 4, 6]))
			.setType(Accessor.Type.SCALAR);

		accessor.setScalar(2, 500);
		strictEqual(accessor.getScalar(1), 2, 'getScalar');
		strictEqual(accessor.getScalar(2), 500, 'getScalar');
	});

	test('getElement/setElement', () => {
		const accessor = new Document()
			.createAccessor()
			.setArray(new Float32Array([1, 2, 3, 4, 6, 7]))
			.setType(Accessor.Type.VEC2);

		accessor.setElement(2, [300, 400]);
		deepEqual(accessor.getElement(1, []), [3, 4], 'getElement');
		deepEqual(accessor.getElement(2, []), [300, 400], 'getElement');
	});

	test('normalized', () => {
		const accessor = new Document()
			.createAccessor()
			.setArray(new Uint8Array([128, 255]))
			.setNormalized(true)
			.setType(Accessor.Type.SCALAR);

		deepEqual(accessor.getMin([])[0].toFixed(2), '128.00', 'getMin');
		deepEqual(accessor.getMinNormalized([])[0].toFixed(2), '0.50', 'getMinNormalized'); // TODO: loose?
		deepEqual(accessor.getMax([])[0].toFixed(2), '255.00', 'getMax');
		deepEqual(accessor.getMaxNormalized([])[0].toFixed(2), '1.00', 'getMaxNormalized'); // TODO: loose?
	});

	test('getComponentType', () => {
		const accessor = new Document().createAccessor();

		strictEqual(accessor.setArray(new Float32Array()).getComponentType(), FLOAT, 'float');
		strictEqual(accessor.setArray(new Uint32Array()).getComponentType(), UNSIGNED_INT, 'uint32');
		strictEqual(accessor.setArray(new Uint16Array()).getComponentType(), UNSIGNED_SHORT, 'uint16');
		strictEqual(accessor.setArray(new Uint8Array()).getComponentType(), UNSIGNED_BYTE, 'uint8');
		strictEqual(accessor.setArray(new Int16Array()).getComponentType(), SHORT, 'int16');
		strictEqual(accessor.setArray(new Int8Array()).getComponentType(), BYTE, 'int8');
		throws(
			() => accessor.setArray(new Int32Array() as unknown as TypedArray).getComponentType(),
			undefined,
			'int32 (throws)',
		);
	});

	test('getComponentSize', () => {
		const accessor = new Document().createAccessor();

		strictEqual(accessor.setArray(new Float32Array()).getComponentSize(), Float32Array.BYTES_PER_ELEMENT, 'float');
		strictEqual(accessor.setArray(new Uint32Array()).getComponentSize(), Uint32Array.BYTES_PER_ELEMENT, 'uint32');
		strictEqual(accessor.setArray(new Uint16Array()).getComponentSize(), Uint16Array.BYTES_PER_ELEMENT, 'uint16');
		strictEqual(accessor.setArray(new Uint8Array()).getComponentSize(), Uint8Array.BYTES_PER_ELEMENT, 'uint8');
		strictEqual(accessor.setArray(new Int16Array()).getComponentSize(), Int16Array.BYTES_PER_ELEMENT, 'int16');
		strictEqual(accessor.setArray(new Int8Array()).getComponentSize(), Int8Array.BYTES_PER_ELEMENT, 'int8');
		throws(
			() => accessor.setArray(new Int32Array() as unknown as TypedArray).getComponentSize(),
			undefined,
			'int32 (throws)',
		);
	});

	test('getElementSize', () => {
		const accessor = new Document().createAccessor();

		strictEqual(accessor.setType('SCALAR').getElementSize(), 1, 'scalar');
		strictEqual(accessor.setType('VEC2').getElementSize(), 2, 'vec2');
		strictEqual(accessor.setType('VEC3').getElementSize(), 3, 'vec3');
		strictEqual(accessor.setType('VEC4').getElementSize(), 4, 'vec4');
		strictEqual(accessor.setType('MAT3').getElementSize(), 9, 'mat3');
		strictEqual(accessor.setType('MAT4').getElementSize(), 16, 'mat4');
		throws(() => accessor.setType('VEC5' as GLTF.AccessorType).getElementSize(), undefined, 'vec5 (throws)');
	});

	test('interleaved', async () => {
		const resources = {
			'test.bin': new Uint8Array(
				new Uint16Array([
					// vertex 1
					0,
					1,
					2,
					10,
					20,
					100,
					200,

					0, // pad

					// vertex 2
					3,
					4,
					5,
					40,
					50,
					400,
					500,

					0, // pad
				]).buffer,
			),
		};

		const json = {
			asset: { version: '2.0' },
			accessors: [
				{
					count: 2,
					bufferView: 0,
					byteOffset: 0,
					type: Accessor.Type.VEC3,
					componentType: UNSIGNED_SHORT,
				},
				{
					count: 2,
					bufferView: 0,
					byteOffset: 6,
					type: Accessor.Type.VEC2,
					componentType: UNSIGNED_SHORT,
				},
				{
					count: 2,
					bufferView: 0,
					byteOffset: 10,
					type: Accessor.Type.VEC2,
					componentType: UNSIGNED_SHORT,
				},
			],
			bufferViews: [
				{
					buffer: 0,
					byteOffset: 0,
					byteStride: 16,
					byteLength: resources['test.bin'].byteLength,
				},
			],
			buffers: [
				{
					uri: 'test.bin',
					byteLength: resources['test.bin'].byteLength,
				},
			],
		};

		const io = await createPlatformIO();
		const document = await io.readJSON({ json, resources });
		const arrays = document
			.getRoot()
			.listAccessors()
			.map((accessor) => accessor.getArray());

		deepEqual(arrays[0], new Uint16Array([0, 1, 2, 3, 4, 5]), 'accessor 1, vec3');
		deepEqual(arrays[1], new Uint16Array([10, 20, 40, 50]), 'accessor 2, vec2');
		deepEqual(arrays[2], new Uint16Array([100, 200, 400, 500]), 'accessor 3, vec2');
	});

	test('read sparse', async () => {
		const resources = {
			'indices.bin': new Uint8Array(new Uint16Array([10, 50, 51]).buffer),
			'values.bin': new Uint8Array(new Float32Array([1, 2, 3, 10, 12, 14, 25, 50, 75]).buffer),
		};

		const json = {
			asset: { version: '2.0' },
			accessors: [
				{
					count: 100,
					type: Accessor.Type.VEC3,
					componentType: FLOAT,
					sparse: {
						count: 3,
						indices: {
							bufferView: 0,
							componentType: UNSIGNED_SHORT,
						},
						values: {
							bufferView: 1,
						},
					},
				},
			],
			bufferViews: [
				{
					buffer: 0,
					byteLength: resources['indices.bin'].byteLength,
				},
				{
					buffer: 1,
					byteLength: resources['values.bin'].byteLength,
				},
			],
			buffers: [
				{
					uri: 'indices.bin',
					byteLength: resources['indices.bin'].byteLength,
				},
				{
					uri: 'values.bin',
					byteLength: resources['values.bin'].byteLength,
				},
			],
		};

		const io = await createPlatformIO();
		const document = await io.readJSON({ json, resources });
		const accessors = document.getRoot().listAccessors();

		const actual = [];
		strictEqual(accessors.length, 1, 'found one sparse accessor');
		deepEqual(accessors[0].getElement(0, actual) && actual, [0, 0, 0], 'empty index 1');
		deepEqual(accessors[0].getElement(10, actual) && actual, [1, 2, 3], 'sparse index 1');
		deepEqual(accessors[0].getElement(50, actual) && actual, [10, 12, 14], 'sparse index 2');
		deepEqual(accessors[0].getElement(51, actual) && actual, [25, 50, 75], 'sparse index 3');
		deepEqual(accessors[0].getElement(52, actual) && actual, [0, 0, 0], 'empty index 2');
	});

	test('write sparse', async () => {
		const document = new Document();
		const buffer = document.createBuffer();
		const emptyArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
		const sparseArray = [0, 0, 0, 0, 0, 25, 0, 0, 15, 0, 0, 0, 0, 0];
		document.createAccessor('Empty').setArray(new Uint8Array(emptyArray)).setSparse(true).setBuffer(buffer);
		document.createAccessor('Sparse').setArray(new Uint8Array(sparseArray)).setSparse(true).setBuffer(buffer);

		const io = await createPlatformIO();
		const { json, resources } = await io.writeJSON(document);

		const emptyDef = json.accessors[0]!;
		const sparseDef = json.accessors[1]!;

		strictEqual(emptyDef.count, 14, 'emptyAccessor.count');
		strictEqual(sparseDef.count, 14, 'sparseAccessor.count');
		strictEqual(emptyDef.sparse, undefined, 'emptyAccessor json');
		deepEqual(
			sparseDef.sparse,
			{
				count: 2,
				indices: {
					bufferView: 0,
					byteOffset: 0,
					componentType: UNSIGNED_BYTE,
				},
				values: {
					bufferView: 1,
					byteOffset: 0,
				},
			},
			'sparseAccessor json',
		);

		const rtDocument = await io.readJSON({ json, resources });
		const rtEmptyAccessor = rtDocument.getRoot().listAccessors()[0];
		const rtSparseAccessor = rtDocument.getRoot().listAccessors()[1];

		strictEqual(rtEmptyAccessor.getSparse(), true, 'emptyAccessor.sparse (round trip)');
		strictEqual(rtSparseAccessor.getSparse(), true, 'sparseAccessor.sparse (round trip)');

		deepEqual(Array.from(rtEmptyAccessor.getArray()), emptyArray, 'emptyAccessor.array (round trip)');
		deepEqual(Array.from(rtSparseAccessor.getArray()), sparseArray, 'sparseAccessor.array (round trip)');
	});

	test('minmax', () => {
		const document = new Document();
		const accessor = document
			.createAccessor()
			.setArray(new Float32Array([0, 0, 0, Infinity, NaN, -Infinity, 1, 0, -1, 0, 0, -3]))
			.setType(Accessor.Type.VEC3);

		deepEqual(accessor.getMin([]), [0, 0, -3], 'computes min, ignoring infinite and NaN');
		deepEqual(accessor.getMax([]), [1, 0, 0], 'computes max, ignoring infinite and NaN');
	});

	test('extras', async () => {
		const io = await createPlatformIO();
		const document = new Document();
		document
			.createAccessor('A')
			.setArray(new Uint8Array([1, 2, 3]))
			.setExtras({ foo: 1, bar: 2 })
			.setBuffer(document.createBuffer());

		const doc2 = await io.readBinary(await io.writeBinary(document));

		deepEqual(document.getRoot().listAccessors()[0].getExtras(), { foo: 1, bar: 2 }, 'storage');
		deepEqual(doc2.getRoot().listAccessors()[0].getExtras(), { foo: 1, bar: 2 }, 'roundtrip');
	});

	// See: https://github.com/donmccurdy/glTF-Transform/issues/1271
	test('clone', async () => {
		const srcDocument = new Document();
		const srcAccessor = srcDocument
			.createAccessor()
			.setType('VEC3')
			.setNormalized(true)
			.setArray(new Uint8Array([0, 64, 255]));
		deepEqual(srcAccessor.getElement(0, []).map(round(2)), [0, 0.25, 1]);

		const dstAccessor = srcAccessor.clone();
		srcAccessor.setArray(new Float32Array([0, 0, 0]));

		deepEqual(dstAccessor.getElement(0, []).map(round(2)), [0, 0.25, 1]);
	});
});
