require('source-map-support').install();

const IS_NODEJS = typeof window === 'undefined';

const test = require('tape');
const { Accessor, Document, NodeIO, TextureInfo, WebIO } = require('../');

let fs, glob, path;
if (IS_NODEJS) {
	fs = require('fs');
	glob = require('glob');
	path = require('path');
}

function ensureDir(uri) {
	const outdir = path.dirname(uri);
	if (!fs.existsSync(outdir)) fs.mkdirSync(outdir);
}

const SAMPLE_GLB = 'data:application/octet-stream;base64,Z2xURgIAAACABgAA3AMAAEpTT057ImFzc2V0Ijp7ImdlbmVyYXRvciI6IkNPTExBREEyR0xURiIsInZlcnNpb24iOiIyLjAifSwic2NlbmUiOjAsInNjZW5lcyI6W3sibm9kZXMiOlswXX1dLCJub2RlcyI6W3siY2hpbGRyZW4iOlsxXSwibWF0cml4IjpbMS4wLDAuMCwwLjAsMC4wLDAuMCwwLjAsLTEuMCwwLjAsMC4wLDEuMCwwLjAsMC4wLDAuMCwwLjAsMC4wLDEuMF19LHsibWVzaCI6MH1dLCJtZXNoZXMiOlt7InByaW1pdGl2ZXMiOlt7ImF0dHJpYnV0ZXMiOnsiTk9STUFMIjoxLCJQT1NJVElPTiI6Mn0sImluZGljZXMiOjAsIm1vZGUiOjQsIm1hdGVyaWFsIjowfV0sIm5hbWUiOiJNZXNoIn1dLCJhY2Nlc3NvcnMiOlt7ImJ1ZmZlclZpZXciOjAsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjMsImNvdW50IjozNiwibWF4IjpbMjNdLCJtaW4iOlswXSwidHlwZSI6IlNDQUxBUiJ9LHsiYnVmZmVyVmlldyI6MSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjI0LCJtYXgiOlsxLjAsMS4wLDEuMF0sIm1pbiI6Wy0xLjAsLTEuMCwtMS4wXSwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjEsImJ5dGVPZmZzZXQiOjI4OCwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjI0LCJtYXgiOlswLjUsMC41LDAuNV0sIm1pbiI6Wy0wLjUsLTAuNSwtMC41XSwidHlwZSI6IlZFQzMifV0sIm1hdGVyaWFscyI6W3sicGJyTWV0YWxsaWNSb3VnaG5lc3MiOnsiYmFzZUNvbG9yRmFjdG9yIjpbMC44MDAwMDAwMTE5MjA5MjksMC4wLDAuMCwxLjBdLCJtZXRhbGxpY0ZhY3RvciI6MC4wfSwibmFtZSI6IlJlZCJ9XSwiYnVmZmVyVmlld3MiOlt7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NTc2LCJieXRlTGVuZ3RoIjo3MiwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjAsImJ5dGVMZW5ndGgiOjU3NiwiYnl0ZVN0cmlkZSI6MTIsInRhcmdldCI6MzQ5NjJ9XSwiYnVmZmVycyI6W3siYnl0ZUxlbmd0aCI6NjQ4fV19iAIAAEJJTgAAAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAC/AAAAvwAAAD8AAAA/AAAAvwAAAD8AAAC/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAvwAAAD8AAAC/AAAAvwAAAD8AAAA/AAAAvwAAAL8AAAC/AAAAvwAAAL8AAAA/AAAAPwAAAD8AAAA/AAAAvwAAAD8AAAA/AAAAPwAAAL8AAAA/AAAAvwAAAL8AAAC/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAC/AAAAPwAAAL8AAAA/AAAAPwAAAL8AAAC/AAAAvwAAAD8AAAC/AAAAPwAAAD8AAAC/AAAAvwAAAL8AAAC/AAAAPwAAAL8AAAC/AAAAvwAAAL8AAAC/AAAAPwAAAL8AAAA/AAAAvwAAAL8AAAA/AAAAPwAAAL8AAAEAAgADAAIAAQAEAAUABgAHAAYABQAIAAkACgALAAoACQAMAA0ADgAPAA4ADQAQABEAEgATABIAEQAUABUAFgAXABYAFQA=';

test('@gltf-transform/core::io | web', {skip: IS_NODEJS}, t => {
	const io = new WebIO();
	t.equals(!!io, true, 'Creates WebIO');

	io.readGLB(SAMPLE_GLB)
		.then((doc) => {
			t.equals(doc.getRoot().listBuffers().length, 1, 'reads a GLB with Fetch API');
		})
		.catch((e) => (t.fail(e)))
		.finally(() => (t.end()));
});

test('@gltf-transform/core::io | node.js read glb', {skip: !IS_NODEJS}, t => {
	glob.sync(path.join(__dirname, 'in', '**/*.glb')).forEach((inputURI) => {
		const basepath = inputURI.replace(path.join(__dirname, 'in'), '');

		const io = new NodeIO(fs, path);
		const doc = io.read(inputURI);

		t.ok(doc, `Read "${basepath}".`)
	});
	t.end();
});

test('@gltf-transform/core::io | node.js read gltf', {skip: !IS_NODEJS}, t => {
	glob.sync(path.join(__dirname, 'in', '**/*.gltf')).forEach((inputURI) => {
		const basepath = inputURI.replace(path.join(__dirname, 'in'), '');

		const io = new NodeIO(fs, path);
		const doc = io.read(inputURI);

		t.ok(doc, `Read "${basepath}".`)
	});
	t.end();
});

test('@gltf-transform/core::io | node.js write glb', {skip: !IS_NODEJS}, t => {
	glob.sync(path.join(__dirname, 'in', '**/*.gltf')).forEach((inputURI) => {
		const basepath = inputURI.replace(path.join(__dirname, 'in'), '');
		const outputURI = path.join(__dirname, 'out', basepath);

		const io = new NodeIO(fs, path);
		const doc = io.read(inputURI);

		ensureDir(outputURI);
		io.write(outputURI.replace('.gltf', '.glb'), doc);
		t.ok(true, `Wrote "${basepath}".`); // TODO(cleanup): Test the output somehow.
	});
	t.end();
});

test('@gltf-transform/core::io | node.js write gltf', {skip: !IS_NODEJS}, t => {
	glob.sync(path.join(__dirname, 'in', '**/*.glb')).forEach((inputURI) => {
		const basepath = inputURI.replace(path.join(__dirname, 'in'), '');
		const outputURI = path.join(__dirname, 'out', basepath);

		const io = new NodeIO(fs, path);
		const doc = io.read(inputURI);

		ensureDir(outputURI);
		io.write(outputURI.replace('.glb', '.gltf'), doc);
		t.ok(true, `Wrote "${basepath}".`); // TODO(cleanup): Test the output somehow.
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

test('@gltf-transform/core::io | resource naming', t => {
	const doc = new Document();
	const buffer1 = doc.createBuffer().setURI('mybuffer.bin');
	const buffer2 = doc.createBuffer().setURI('');
	const buffer3 = doc.createBuffer();
	doc.createBuffer().setURI('empty.bin');

	// Empty buffers aren't written.
	doc.createAccessor().setArray(new Uint8Array([1, 2, 3])).setBuffer(buffer1);
	doc.createAccessor().setArray(new Uint8Array([1, 2, 3])).setBuffer(buffer2);
	doc.createAccessor().setArray(new Uint8Array([1, 2, 3])).setBuffer(buffer3);

	const io = new NodeIO(fs, path);
	const nativeDoc = io.createNativeDocument(doc, {basename: 'basename', isGLB: false});

	t.true('mybuffer.bin' in nativeDoc.resources, 'explicitly named buffer');
	t.true('basename_1.bin' in nativeDoc.resources, 'implicitly named buffer #1');
	t.true('basename_2.bin' in nativeDoc.resources, 'implicitly named buffer #2');
	t.false('empty.bin' in nativeDoc.resources, 'empty buffer skipped');
	t.end();
});

test('@gltf-transform/core::io | read textures', t => {
	const nativeDoc = {
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
	const doc = io.createDocument(nativeDoc);
	const root = doc.getRoot();
	const mat1 = root.listMaterials()[0];
	const mat2 = root.listMaterials()[1];

	t.equals(root.listTextures().length, 2, 'reads two textures');
	t.equals(mat1.getNormalTexture().getURI(), 'tex1.png', 'assigns texture');
	t.equals(mat1.getOcclusionTexture().getURI(), 'tex1.png', 'reuses texture');
	t.equals(mat1.getNormalTextureSampler().getWrapS(), 33071, 'assigns sampler properties');
	t.equals(mat1.getOcclusionTextureSampler().getWrapS(), 10497, 'keeps default sampler properties');
	t.equals(mat2.getNormalTexture().getURI(), 'tex2.jpeg', 'assigns 2nd texture');
	t.equals(root.listTextures()[0].getMimeType(), 'image/png', 'assigns "image/png" MIME type');
	t.equals(root.listTextures()[1].getMimeType(), 'image/jpeg', 'assigns "image/jpeg" MIME type');
	t.end();
});

test('@gltf-transform/core::io | write textures', t => {
	const doc = new Document();
	const image1 = new ArrayBuffer(1);
	const image2 = new ArrayBuffer(2);
	const texture1 = doc.createTexture('tex1')
		.setImage(image1)
		.setURI('tex1.png');
	const texture2 = doc.createTexture('tex2')
		.setImage(image2)
		.setMimeType('image/jpeg');
	doc.createMaterial('mat1')
		.setBaseColorTexture(texture1)
		.setNormalTexture(texture2);
	doc.createMaterial('mat2')
		.setBaseColorTexture(texture1)
		.getBaseColorTextureSampler()
		.setWrapS(TextureInfo.CLAMP_TO_EDGE);

	const io = new NodeIO(fs, path);
	const nativeDoc = io.createNativeDocument(doc, {basename: 'basename', isGLB: false});

	t.false('basename.bin' in nativeDoc.resources, 'external image resources');
	t.true('tex1.png' in nativeDoc.resources, 'writes tex1.png');
	t.true('basename_1.jpeg' in nativeDoc.resources, 'writes default-named jpeg');
	t.equals(nativeDoc.json.images.length, 2, 'reuses images');
	t.equals(nativeDoc.json.textures.length, 3, 'writes three textures');
	t.equals(nativeDoc.json.samplers.length, 2, 'reuses samplers');
	t.end();
});
