require('source-map-support').install();

const IS_NODEJS = typeof window === 'undefined';

import * as test from 'tape';
import { BufferUtils, NodeIO, WebIO } from '../';

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

const SAMPLE_GLTF = {
	asset: {version: '2.0'},
	scenes: [{name: 'Default Scene'}],
};

function mockFetch(response: object): void {
	global['fetch'] = (): Promise<unknown> => Promise.resolve(response);
}

test('@gltf-transform/core::io | web read glb', t => {
	mockFetch({
		arrayBuffer: () => BufferUtils.createBufferFromDataURI(SAMPLE_GLB),
		json: () => { throw new Error('Do not call.'); },
	});

	const io = new WebIO();
	t.equals(!!io, true, 'creates WebIO');

	io.read('mock.glb')
		.then((doc) => {
			t.equals(doc.getRoot().listBuffers().length, 1, 'reads a GLB with Fetch API');
		})
		.catch((e) => (t.fail(e)))
		.finally(() => (t.end()));
});

test('@gltf-transform/core::io | web read gltf', t => {
	mockFetch({
		arrayBuffer: () => { throw new Error('Do not call.'); },
		json: () => SAMPLE_GLTF,
	});

	const io = new WebIO();
	t.equals(!!io, true, 'creates WebIO');

	io.read('mock.gltf')
		.then((doc) => {
			t.equals(doc.getRoot().listScenes().length, 1, 'reads a glTF with Fetch API');
		})
		.catch((e) => (t.fail(e)))
		.finally(() => (t.end()));
});

test('@gltf-transform/core::io | node.js read glb', {skip: !IS_NODEJS}, t => {
	glob.sync(path.join(__dirname, 'in', '**/*.glb')).forEach((inputURI) => {
		const basepath = inputURI.replace(path.join(__dirname, 'in'), '');

		const io = new NodeIO();
		const doc = io.read(inputURI);

		t.ok(doc, `Read "${basepath}".`)
	});
	t.end();
});

test('@gltf-transform/core::io | node.js read gltf', {skip: !IS_NODEJS}, t => {
	glob.sync(path.join(__dirname, 'in', '**/*.gltf')).forEach((inputURI) => {
		const basepath = inputURI.replace(path.join(__dirname, 'in'), '');

		const io = new NodeIO();
		const doc = io.read(inputURI);

		t.ok(doc, `Read "${basepath}".`)
	});
	t.end();
});

test('@gltf-transform/core::io | node.js write glb', {skip: !IS_NODEJS}, t => {
	glob.sync(path.join(__dirname, 'in', '**/*.gltf')).forEach((inputURI) => {
		const basepath = inputURI.replace(path.join(__dirname, 'in'), '');
		const outputURI = path.join(__dirname, 'out', basepath);

		const io = new NodeIO();
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

		const io = new NodeIO();
		const doc = io.read(inputURI);

		ensureDir(outputURI);
		io.write(outputURI.replace('.glb', '.gltf'), doc);
		t.ok(true, `Wrote "${basepath}".`); // TODO(cleanup): Test the output somehow.
	});
	t.end();
});

test('@gltf-transform/core::io | common', t => {
	t.throws(() => new NodeIO().readJSON({
		json: {asset: {version: '1.0'}},
		resources: {},
	}), '1.0');
	t.end();
});
