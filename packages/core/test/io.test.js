require('source-map-support').install();

const fs = require('fs');
const test = require('tape');
const glob = require('glob');
const path = require('path');
const { Container, NodeIO } = require('../');

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
		asset: {version: '2.0'},
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

	t.deepEqual(arrays[0], [0, 1, 2, 3, 4, 5], 'accessor 1, vec3');
	t.deepEqual(arrays[1], [10, 20, 40, 50], 'accessor 2, vec2');
	t.deepEqual(arrays[2], [100, 200, 400, 500], 'accessor 3, vec2');
	t.end();
});

test('@gltf-transform/core::io | sparse accessors', t => {
	const resources = {
		'indices.bin': new Uint16Array([10, 50, 51]).buffer,
		'values.bin': new Float32Array([1, 2, 3, 10, 12, 14, 25, 50, 75]).buffer,
	};

	const json = {
		asset: {version: '2.0'},
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

	const actual = [];
	t.equals(accessors.length, 1, 'found one sparse accessor');
	t.deepEquals(accessors[0].getValue(0, actual) && actual, [0, 0, 0], 'empty index 1');
	t.deepEquals(accessors[0].getValue(10, actual) && actual, [1, 2, 3], 'sparse index 1');
	t.deepEquals(accessors[0].getValue(50, actual) && actual, [10, 12, 14], 'sparse index 2');
	t.deepEquals(accessors[0].getValue(51, actual) && actual, [25, 50, 75], 'sparse index 3');
	t.deepEquals(accessors[0].getValue(52, actual) && actual, [0, 0, 0], 'empty index 2');

	t.end();
});

test('@gltf-transform/core::io | resource naming', t => {
	const container = new Container();
	const buffer1 = container.createBuffer().setURI('mybuffer.bin');
	const buffer2 = container.createBuffer().setURI('');
	const buffer3 = container.createBuffer();
	container.createBuffer().setURI('empty.bin');

	// Empty buffers aren't written.
	container.createAccessor().setArray(new Uint8Array([1, 2, 3])).setBuffer(buffer1);
	container.createAccessor().setArray(new Uint8Array([1, 2, 3])).setBuffer(buffer2);
	container.createAccessor().setArray(new Uint8Array([1, 2, 3])).setBuffer(buffer3);

	const io = new NodeIO(fs, path);
	const asset = io.containerToAsset(container, {basename: 'basename', isGLB: false});

	t.true('mybuffer.bin' in asset.resources, 'explicitly named buffer');
	t.true('basename_1.bin' in asset.resources, 'implicitly named buffer #1');
	t.true('basename_2.bin' in asset.resources, 'implicitly named buffer #2');
	t.false('empty.bin' in asset.resources, 'empty buffer skipped');
	t.end();
});

test('@gltf-transform/core::io | read textures', t => {
	const asset = {
		json: {
			asset: {version: '2.0'},
			textures: [
				{source: 0, sampler: 0},
				{source: 1},
				{source: 0},
			],
			samplers: [
				{wrapS: 33071}
			],
			images: [
				{uri: 'tex1.png'},
				{uri: 'tex2.jpeg'},
			],
			materials: [
				{normalTexture: {index: 0}, occlusionTexture: {index: 2}},
				{normalTexture: {index: 1}}
			]
		},
		resources: {
			'tex1.png': new ArrayBuffer(1),
			'tex2.jpeg': new ArrayBuffer(2),
		}
	};

	const io = new NodeIO(fs, path);
	const container = io.assetToContainer(asset);
	const root = container.getRoot();
	const mat1 = root.listMaterials()[0];
	const mat2 = root.listMaterials()[1];

	t.equals(root.listTextures().length, 2, 'reads two textures');
	t.equals(mat1.getNormalTexture().getURI(), 'tex1.png', 'assigns texture');
	t.equals(mat1.getOcclusionTexture().getURI(), 'tex1.png', 'reuses texture');
	t.equals(mat1.getNormalTextureInfo().getWrapS(), 33071, 'assigns sampler properties');
	t.equals(mat1.getOcclusionTextureInfo().getWrapS(), 10497, 'keeps default sampler properties');
	t.equals(mat2.getNormalTexture().getURI(), 'tex2.jpeg', 'assigns 2nd texture');
	t.equals(root.listTextures()[0].getMimeType(), 'image/png', 'assigns "image/png" MIME type');
	t.equals(root.listTextures()[1].getMimeType(), 'image/jpeg', 'assigns "image/jpeg" MIME type');
	t.end();
});

test('@gltf-transform/core::io | write textures', t => {
	const container = new Container();
	const image1 = new ArrayBuffer(1);
	const image2 = new ArrayBuffer(2);
	const texture1 = container.createTexture('tex1')
		.setImage(image1)
		.setURI('tex1.png');
	const texture2 = container.createTexture('tex2')
		.setImage(image2)
		.setMimeType('image/jpeg');
	container.createMaterial('mat1')
		.setBaseColorTexture(texture1)
		.setNormalTexture(texture2);
	container.createMaterial('mat2')
		.setBaseColorTexture(texture1)
		.getBaseColorTextureInfo()
		.setWrapS(33071); // TODO(donmccurdy) enum

	const io = new NodeIO(fs, path);
	const asset = io.containerToAsset(container, {basename: 'basename', isGLB: false});

	t.false('basename.bin' in asset.resources, 'external image resources');
	t.true('tex1.png' in asset.resources, 'writes tex1.png');
	t.true('basename_1.jpeg' in asset.resources, 'writes default-named jpeg');
	t.equals(asset.json.images.length, 2, 'reuses images');
	t.equals(asset.json.textures.length, 3, 'writes three textures');
	t.equals(asset.json.samplers.length, 2, 'reuses samplers');
	t.end();
});
