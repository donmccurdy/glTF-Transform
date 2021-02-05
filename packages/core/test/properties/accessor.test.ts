require('source-map-support').install();

import test from 'tape';
import { Accessor, Document, GLTF, NodeIO, TypedArray } from '../../';

test('@gltf-transform/core::accessor | getScalar/setScalar', t => {
	const accessor = new Document().createAccessor()
		.setArray(new Float32Array([1, 2, 3, 4, 6]))
		.setType(Accessor.Type.SCALAR);

	accessor.setScalar(2, 500);
	t.equal(accessor.getScalar(1), 2, 'getScalar');
	t.equal(accessor.getScalar(2), 500, 'getScalar');
	t.end();
});

test('@gltf-transform/core::accessor | getElement/setElement', t => {
	const accessor = new Document().createAccessor()
		.setArray(new Float32Array([1, 2, 3, 4, 6, 7]))
		.setType(Accessor.Type.VEC2);

	accessor.setElement(2, [300, 400]);
	t.deepEqual(accessor.getElement(1, []), [3, 4], 'getElement');
	t.deepEqual(accessor.getElement(2, []), [300, 400], 'getElement');
	t.end();
});

test('@gltf-transform/core::accessor | normalized', t => {
	const accessor = new Document().createAccessor()
		.setArray(new Uint8Array([128, 255]))
		.setNormalized(true)
		.setType(Accessor.Type.SCALAR);

	t.deepEqual(accessor.getMin([])[0].toFixed(2), '128.00', 'getMin');
	t.deepLooseEqual(accessor.getMinNormalized([])[0].toFixed(2), '0.50', 'getMinNormalized');
	t.deepEqual(accessor.getMax([])[0].toFixed(2), '255.00', 'getMax');
	t.deepLooseEqual(accessor.getMaxNormalized([])[0].toFixed(2), '1.00', 'getMaxNormalized');
	t.end();
});

test('@gltf-transform/core::accessor | getComponentType', t => {
	const accessor = new Document().createAccessor();

	t.equal(
		accessor.setArray(new Float32Array()).getComponentType(),
		Accessor.ComponentType.FLOAT,
		'float'
	);
	t.equal(
		accessor.setArray(new Uint32Array()).getComponentType(),
		Accessor.ComponentType.UNSIGNED_INT,
		'uint32'
	);
	t.equal(
		accessor.setArray(new Uint16Array()).getComponentType(),
		Accessor.ComponentType.UNSIGNED_SHORT,
		'uint16'
	);
	t.equal(
		accessor.setArray(new Uint8Array()).getComponentType(),
		Accessor.ComponentType.UNSIGNED_BYTE,
		'uint8'
	);
	t.equal(
		accessor.setArray(new Int16Array()).getComponentType(),
		Accessor.ComponentType.SHORT,
		'int16'
	);
	t.equal(
		accessor.setArray(new Int8Array()).getComponentType(),
		Accessor.ComponentType.BYTE,
		'int8'
	);
	t.throws(
		() => accessor.setArray(new Int32Array() as unknown as TypedArray).getComponentType(),
		'int32 (throws)'
	);
	t.end();
});

test('@gltf-transform/core::accessor | getComponentSize', t => {
	const accessor = new Document().createAccessor();

	t.equal(
		accessor.setArray(new Float32Array()).getComponentSize(),
		Float32Array.BYTES_PER_ELEMENT,
		'float'
	);
	t.equal(
		accessor.setArray(new Uint32Array()).getComponentSize(),
		Uint32Array.BYTES_PER_ELEMENT,
		'uint32'
	);
	t.equal(
		accessor.setArray(new Uint16Array()).getComponentSize(),
		Uint16Array.BYTES_PER_ELEMENT,
		'uint16'
	);
	t.equal(
		accessor.setArray(new Uint8Array()).getComponentSize(),
		Uint8Array.BYTES_PER_ELEMENT,
		'uint8'
	);
	t.equal(
		accessor.setArray(new Int16Array()).getComponentSize(),
		Int16Array.BYTES_PER_ELEMENT,
		'int16'
	);
	t.equal(
		accessor.setArray(new Int8Array()).getComponentSize(),
		Int8Array.BYTES_PER_ELEMENT,
		'int8'
	);
	t.throws(
		() => accessor.setArray(new Int32Array() as unknown as TypedArray).getComponentSize(),
		'int32 (throws)'
	);
	t.end();
});

test('@gltf-transform/core::accessor | getElementSize', t => {
	const accessor = new Document().createAccessor();

	t.equal(accessor.setType('SCALAR').getElementSize(), 1, 'scalar');
	t.equal(accessor.setType('VEC2').getElementSize(), 2, 'vec2');
	t.equal(accessor.setType('VEC3').getElementSize(), 3, 'vec3');
	t.equal(accessor.setType('VEC4').getElementSize(), 4, 'vec4');
	t.equal(accessor.setType('MAT3').getElementSize(), 9, 'mat3');
	t.equal(accessor.setType('MAT4').getElementSize(), 16, 'mat4');
	t.throws(() => accessor.setType('VEC5' as GLTF.AccessorType).getElementSize(), 'vec5 (throws)');
	t.end();
});

test('@gltf-transform/core::accessor | interleaved', t => {
	const resources = {'test.bin': new Uint16Array([
		// vertex 1
		0, 1, 2,
		10, 20,
		100, 200,

		0, // pad

		// vertex 2
		3, 4, 5,
		40, 50,
		400, 500,

		0, // pad
	]).buffer};

	const json = {
		asset: {version: '2.0'},
		accessors: [
			{
				count: 2,
				bufferView: 0,
				byteOffset: 0,
				type: Accessor.Type.VEC3,
				componentType: Accessor.ComponentType.UNSIGNED_SHORT,
			},
			{
				count: 2,
				bufferView: 0,
				byteOffset: 6,
				type: Accessor.Type.VEC2,
				componentType: Accessor.ComponentType.UNSIGNED_SHORT,
			},
			{
				count: 2,
				bufferView: 0,
				byteOffset: 10,
				type: Accessor.Type.VEC2,
				componentType: Accessor.ComponentType.UNSIGNED_SHORT,
			},
		],
		bufferViews: [
			{
				buffer: 0,
				byteOffset: 0,
				byteStride: 16,
				byteLength: resources['test.bin'].byteLength
			}
		],
		buffers: [{
			uri: 'test.bin',
			byteLength: resources['test.bin'].byteLength
		}]
	};

	const io = new NodeIO();
	const doc = io.readJSON({json, resources});
	const arrays = doc.getRoot()
		.listAccessors()
		.map((accessor) => accessor.getArray());

	t.deepEqual(arrays[0], new Uint16Array([0, 1, 2, 3, 4, 5]), 'accessor 1, vec3');
	t.deepEqual(arrays[1], new Uint16Array([10, 20, 40, 50]), 'accessor 2, vec2');
	t.deepEqual(arrays[2], new Uint16Array([100, 200, 400, 500]), 'accessor 3, vec2');
	t.end();
});

test('@gltf-transform/core::accessor | sparse', t => {
	const resources = {
		'indices.bin': new Uint16Array([10, 50, 51]).buffer,
		'values.bin': new Float32Array([1, 2, 3, 10, 12, 14, 25, 50, 75]).buffer,
	};

	const json = {
		asset: {version: '2.0'},
		accessors: [
			{
				count: 100,
				type: Accessor.Type.VEC3,
				componentType: Accessor.ComponentType.FLOAT,
				sparse: {
					count: 3,
					indices: {
						bufferView: 0,
						componentType: Accessor.ComponentType.UNSIGNED_SHORT
					},
					values: {
						bufferView: 1
					}
				}
			}
		],
		bufferViews: [
			{
				buffer: 0,
				byteLength: resources['indices.bin'].byteLength
			},
			{
				buffer: 1,
				byteLength: resources['values.bin'].byteLength
			}
		],
		buffers: [
			{
				uri: 'indices.bin',
				byteLength: resources['indices.bin'].byteLength
			},
			{
				uri: 'values.bin',
				byteLength: resources['values.bin'].byteLength
			},
		]
	};

	const io = new NodeIO();
	const doc = io.readJSON({json, resources});
	const accessors = doc.getRoot()
		.listAccessors();

	const actual = [];
	t.equals(accessors.length, 1, 'found one sparse accessor');
	t.deepEquals(accessors[0].getElement(0, actual) && actual, [0, 0, 0], 'empty index 1');
	t.deepEquals(accessors[0].getElement(10, actual) && actual, [1, 2, 3], 'sparse index 1');
	t.deepEquals(accessors[0].getElement(50, actual) && actual, [10, 12, 14], 'sparse index 2');
	t.deepEquals(accessors[0].getElement(51, actual) && actual, [25, 50, 75], 'sparse index 3');
	t.deepEquals(accessors[0].getElement(52, actual) && actual, [0, 0, 0], 'empty index 2');

	t.end();
});

test('@gltf-transform/core::accessor | minmax', t => {
	const doc = new Document();
	const accessor = doc.createAccessor()
		.setArray(new Float32Array([
			0, 0, 0,
			Infinity, NaN, -Infinity,
			1, 0, -1,
			0, 0, -3,
		]))
		.setType(Accessor.Type.VEC3);

	t.deepEqual(accessor.getMin([]), [0, 0, -3], 'computes min, ignoring infinite and NaN');
	t.deepEqual(accessor.getMax([]), [1, 0, 0], 'computes max, ignoring infinite and NaN');
	t.end();
});

test('@gltf-transform/core::accessor | extras', t => {
	const io = new NodeIO();
	const doc = new Document();
	doc.createAccessor('A')
		.setArray(new Uint8Array([1, 2, 3]))
		.setExtras({foo: 1, bar: 2})
		.setBuffer(doc.createBuffer());

	const doc2 = io.readBinary(io.writeBinary(doc));

	t.deepEqual(doc.getRoot().listAccessors()[0].getExtras(), {foo: 1, bar: 2}, 'storage');
	t.deepEqual(doc2.getRoot().listAccessors()[0].getExtras(), {foo: 1, bar: 2}, 'roundtrip');

	t.end();
});
