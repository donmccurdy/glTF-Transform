require('source-map-support').install();

const fs = require('fs');
const test = require('tape');
const glob = require('glob');
const path = require('path');
const { NodeIO } = require('../');

function ensureDir(uri) {
	const outdir = path.dirname(uri);
	if (!fs.existsSync(outdir)) fs.mkdirSync(outdir);
}

test('@gltf-transform/core::io | read glb', t => {
	glob.sync(path.join(__dirname, 'in', '**/*.glb')).forEach((inputURI) => {
		const basepath = inputURI.replace(path.join(__dirname, 'in'), '');

		const io = new NodeIO(fs, path);
		const container = io.read(inputURI);

		t.ok(container, `Read "${basepath}".`)
	});
	t.end();
});

test('@gltf-transform/core::io | read gltf', t => {
	glob.sync(path.join(__dirname, 'in', '**/*.gltf')).forEach((inputURI) => {
		const basepath = inputURI.replace(path.join(__dirname, 'in'), '');

		const io = new NodeIO(fs, path);
		const container = io.read(inputURI);

		t.ok(container, `Read "${basepath}".`)
	});
	t.end();
});

test('@gltf-transform/core::io | write glb', t => {
	glob.sync(path.join(__dirname, 'in', '**/*.gltf')).forEach((inputURI) => {
		const basepath = inputURI.replace(path.join(__dirname, 'in'), '');
		const outputURI = path.join(__dirname, 'out', basepath);

		const io = new NodeIO(fs, path);
		const container = io.read(inputURI);

		ensureDir(outputURI);
		io.write(outputURI.replace('.gltf', '.glb'), container);
		t.ok(true, `Wrote "${basepath}".`); // TODO(donmccurdy): Test the output somehow.
	});
	t.end();
});

test('@gltf-transform/core::io | write gltf', t => {
	glob.sync(path.join(__dirname, 'in', '**/*.glb')).forEach((inputURI) => {
		const basepath = inputURI.replace(path.join(__dirname, 'in'), '');
		const outputURI = path.join(__dirname, 'out', basepath);

		const io = new NodeIO(fs, path);
		const container = io.read(inputURI);

		ensureDir(outputURI);
		io.write(outputURI.replace('.glb', '.gltf'), container);
		t.ok(true, `Wrote "${basepath}".`); // TODO(donmccurdy): Test the output somehow.
	});
	t.end();
});

test('@gltf-transform/core::io | interleaved accessors', t => {
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
		accessors: [
			{
				count: 2,
				bufferView: 0,
				byteOffset: 0,
				type: 'VEC3',
				componentType: 5123, // TODO(donmccurdy): enum
			},
			{
				count: 2,
				bufferView: 0,
				byteOffset: 6,
				type: 'VEC2',
				componentType: 5123, // TODO(donmccurdy): enum
			},
			{
				count: 2,
				bufferView: 0,
				byteOffset: 10,
				type: 'VEC2',
				componentType: 5123, // TODO(donmccurdy): enum
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
	const container = io.assetToContainer({json, resources});
	const arrays = container.getRoot()
		.listAccessors()
		.map((accessor) => accessor.getArray());

	t.deepEqual(arrays[0], [1, 2, 3, 4, 5], 'accessor 1, vec3');
	t.deepEqual(arrays[1], [10, 20, 30, 40, 50], 'accessor 2, vec2');
	t.deepEqual(arrays[2], [100, 200, 300, 400, 500], 'accessor 3, vec2');
	t.end();
});

test('@gltf-transform/core::io | sparse accessors', t => {
	const resources = {
		'indices.bin': new Uint16Array([10, 50, 51]).buffer,
		'values.bin': new Float32Array([1, 2, 3, 10, 12, 14, 25, 50, 75]).buffer,
	};

	const json = {
		accessors: [
			{
				count: 100,
				type: 'VEC3',
				componentType: 5126, // TODO(donmccurdy): enum
				sparse: {
					count: 3,
					indices: {
						bufferView: 0,
						componentType: 5123
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
	const container = io.assetToContainer({json, resources});
	const accessors = container.getRoot()
		.listAccessors();

	t.equals(accessors.length, 1, 'found one sparse accessor');
	t.deepEquals(accessors[0].getXYZ(0), {x: 0, y: 0, z: 0}, 'empty index 1');
	t.deepEquals(accessors[0].getXYZ(10), {x: 1, y: 2, z: 3}, 'sparse index 1');
	t.deepEquals(accessors[0].getXYZ(50), {x: 10, y: 12, z: 14}, 'sparse index 2');
	t.deepEquals(accessors[0].getXYZ(51), {x: 25, y: 50, z: 75}, 'sparse index 3');
	t.deepEquals(accessors[0].getXYZ(52), {x: 0, y: 0, z: 0}, 'empty index 2');

	t.end();
});

// test('@gltf-transform/core::analyze', (t) => {
//   const filename = path.join(__dirname, 'in', 'BoxVertexColors.glb');
//   const container = new NodeIO(fs, path).read_v2(filename);
//   const report = GLTFUtil.analyze(container);
//   // TODO(donmccurdy): v2 analysis only partially implemented.
//   t.deepEqual(report, {
//     meshes: 1,
//     textures: 0,
//     images: 0,
//     materials: 1,
//     animations: 0,
//     primitives: 1,
//     dataUsage: {
//       geometry: 1224,
//       targets: 0,
//       animation: 0,
//       textures: 0,
//       json: 1647
//     }
//   }, 'BoxVertexColors.glb -- analysis');
//   t.end();
// });
