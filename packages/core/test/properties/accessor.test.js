require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');
const { Accessor, Document, NodeIO } = require('../../');

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
		buffers: [{uri: 'test.bin'}]
	};

	const io = new NodeIO(fs, path);
	const doc = io.createDocument({json, resources});
	const arrays = doc.getRoot()
		.listAccessors()
		.map((accessor) => accessor.getArray());

	t.deepEqual(arrays[0], [0, 1, 2, 3, 4, 5], 'accessor 1, vec3');
	t.deepEqual(arrays[1], [10, 20, 40, 50], 'accessor 2, vec2');
	t.deepEqual(arrays[2], [100, 200, 400, 500], 'accessor 3, vec2');
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
			{uri: 'indices.bin'},
			{uri: 'values.bin'},
		]
	};

	const io = new NodeIO(fs, path);
	const doc = io.createDocument({json, resources});
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
		.setType('VEC3');

	t.deepEqual(accessor.getMin([]), [0, 0, -3], 'computes min, ignoring infinite and NaN');
	t.deepEqual(accessor.getMax([]), [1, 0, 0], 'computes max, ignoring infinite and NaN');
	t.end();
});
