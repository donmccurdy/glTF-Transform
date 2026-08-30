import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { BufferUtils, WebIO } from '@gltf-transform/core';

const SAMPLE_GLB =
	'data:application/octet-stream;base64,Z2xURgIAAACABgAA3AMAAEpTT057ImFzc2V0Ijp7ImdlbmVyYXRvciI6IkNPTExBREEyR0xURiIsInZlcnNpb24iOiIyLjAifSwic2NlbmUiOjAsInNjZW5lcyI6W3sibm9kZXMiOlswXX1dLCJub2RlcyI6W3siY2hpbGRyZW4iOlsxXSwibWF0cml4IjpbMS4wLDAuMCwwLjAsMC4wLDAuMCwwLjAsLTEuMCwwLjAsMC4wLDEuMCwwLjAsMC4wLDAuMCwwLjAsMC4wLDEuMF19LHsibWVzaCI6MH1dLCJtZXNoZXMiOlt7InByaW1pdGl2ZXMiOlt7ImF0dHJpYnV0ZXMiOnsiTk9STUFMIjoxLCJQT1NJVElPTiI6Mn0sImluZGljZXMiOjAsIm1vZGUiOjQsIm1hdGVyaWFsIjowfV0sIm5hbWUiOiJNZXNoIn1dLCJhY2Nlc3NvcnMiOlt7ImJ1ZmZlclZpZXciOjAsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjMsImNvdW50IjozNiwibWF4IjpbMjNdLCJtaW4iOlswXSwidHlwZSI6IlNDQUxBUiJ9LHsiYnVmZmVyVmlldyI6MSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjI0LCJtYXgiOlsxLjAsMS4wLDEuMF0sIm1pbiI6Wy0xLjAsLTEuMCwtMS4wXSwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjEsImJ5dGVPZmZzZXQiOjI4OCwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjI0LCJtYXgiOlswLjUsMC41LDAuNV0sIm1pbiI6Wy0wLjUsLTAuNSwtMC41XSwidHlwZSI6IlZFQzMifV0sIm1hdGVyaWFscyI6W3sicGJyTWV0YWxsaWNSb3VnaG5lc3MiOnsiYmFzZUNvbG9yRmFjdG9yIjpbMC44MDAwMDAwMTE5MjA5MjksMC4wLDAuMCwxLjBdLCJtZXRhbGxpY0ZhY3RvciI6MC4wfSwibmFtZSI6IlJlZCJ9XSwiYnVmZmVyVmlld3MiOlt7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NTc2LCJieXRlTGVuZ3RoIjo3MiwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjAsImJ5dGVMZW5ndGgiOjU3NiwiYnl0ZVN0cmlkZSI6MTIsInRhcmdldCI6MzQ5NjJ9XSwiYnVmZmVycyI6W3siYnl0ZUxlbmd0aCI6NjQ4fV19iAIAAEJJTgAAAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAC/AAAAvwAAAD8AAAA/AAAAvwAAAD8AAAC/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAvwAAAD8AAAC/AAAAvwAAAD8AAAA/AAAAvwAAAL8AAAC/AAAAvwAAAL8AAAA/AAAAPwAAAD8AAAA/AAAAvwAAAD8AAAA/AAAAPwAAAL8AAAA/AAAAvwAAAL8AAAC/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAC/AAAAPwAAAL8AAAA/AAAAPwAAAL8AAAC/AAAAvwAAAD8AAAC/AAAAPwAAAD8AAAC/AAAAvwAAAL8AAAC/AAAAPwAAAL8AAAC/AAAAvwAAAL8AAAC/AAAAPwAAAL8AAAA/AAAAvwAAAL8AAAA/AAAAPwAAAL8AAAEAAgADAAIAAQAEAAUABgAHAAYABQAIAAkACgALAAoACQAMAA0ADgAPAA4ADQAQABEAEgATABIAEQAUABUAFgAXABYAFQA=';

function mockWindow(href: string): void {
	(global['window'] as unknown) = { location: { href } };
}

function mockFetch(response: unknown): string[] {
	const paths = [];
	(global['fetch'] as unknown) = (path: string): Promise<unknown> => {
		paths.push(path);
		return Promise.resolve(response);
	};
	return paths;
}

describe('core::WebIO', () => {
	test('read glb', async () => {
		mockWindow('https://www.example.com/test');
		mockFetch({
			arrayBuffer: () => BufferUtils.createBufferFromDataURI(SAMPLE_GLB),
			text: () => {
				throw new Error('Do not call.');
			},
			json: () => {
				throw new Error('Do not call.');
			},
		});

		const io = new WebIO();
		ok(io, 'creates WebIO');

		const document = await io.read('mock.glb');
		strictEqual(document.getRoot().listBuffers().length, 1, 'reads a GLB with Fetch API');
	});

	test('read glb + resources', async () => {
		const json = {
			asset: { version: '2.0' },
			scenes: [{ name: 'Default Scene' }],
			images: [
				{ uri: 'image1.png' },
				{ uri: '/abs/path/image2.png' },
				{ uri: './rel/path/image3.png' },
				{ uri: 'rel/path/image3.png' },
			],
		};

		const jsonText = JSON.stringify(json);
		const jsonChunkData = BufferUtils.pad(BufferUtils.encodeText(jsonText), 0x20);
		const jsonChunkHeader = BufferUtils.toView(new Uint32Array([jsonChunkData.byteLength, 0x4e4f534a]));
		const jsonChunk = BufferUtils.concat([jsonChunkHeader, jsonChunkData]);

		const binaryChunkData = BufferUtils.pad(new Uint8Array(0), 0x00);
		const binaryChunkHeader = BufferUtils.toView(new Uint32Array([binaryChunkData.byteLength, 0x004e4942]));
		const binaryChunk = BufferUtils.concat([binaryChunkHeader, binaryChunkData]);

		const header = BufferUtils.toView(
			new Uint32Array([0x46546c67, 2, 12 + jsonChunk.byteLength + binaryChunk.byteLength]),
		);

		const responses = [
			new Uint8Array(4),
			new Uint8Array(3),
			new Uint8Array(2),
			new Uint8Array(1),
			BufferUtils.concat([header, jsonChunk, binaryChunk]),
		].map(toArrayBuffer);

		mockWindow('https://www.example.com/test');
		const fetchedPaths = mockFetch({
			arrayBuffer: () => responses.pop(),
			text: () => {
				throw new Error('Do not call.');
			},
			json: () => {
				throw new Error('Do not call.');
			},
		});

		const io = new WebIO();
		ok(io, 'creates WebIO');

		const document = await io.read('model/dir/mock.glb');
		deepEqual(
			fetchedPaths,
			[
				'model/dir/mock.glb',
				'model/dir/image1.png',
				'/abs/path/image2.png',
				'model/dir/rel/path/image3.png',
				'model/dir/rel/path/image3.png',
			],
			'reads all linked resources',
		);
		strictEqual(document.getRoot().listScenes().length, 1, 'reads GLB + resources with Fetch API');
	});

	test('read gltf', async () => {
		const json = JSON.stringify({
			asset: { version: '2.0' },
			scenes: [{ name: 'Default Scene' }],
			images: [
				{ uri: 'image1.png' },
				{ uri: '/abs/path/image2.png' },
				{ uri: './rel/path/image3.png' },
				{ uri: 'rel/path/image3.png' },
			],
		});
		const gltf = toArrayBuffer(BufferUtils.encodeText(json));
		const images = [new Uint8Array(4), new Uint8Array(3), new Uint8Array(2), new Uint8Array(1)].map(toArrayBuffer);
		const responses = [...images, gltf];

		mockWindow('https://www.example.com/test');
		const fetchedPaths = mockFetch({
			arrayBuffer: () => responses.pop(),
			text: () => {
				throw new Error('Do not call.');
			},
		});

		const io = new WebIO();
		ok(io, 'creates WebIO');

		const document = await io.read('model/dir/mock.gltf');
		deepEqual(
			fetchedPaths,
			[
				'model/dir/mock.gltf',
				'model/dir/image1.png',
				'/abs/path/image2.png',
				'model/dir/rel/path/image3.png',
				'model/dir/rel/path/image3.png',
			],
			'reads all linked resources',
		);
		strictEqual(document.getRoot().listScenes().length, 1, 'reads a glTF with Fetch API');
	});

	test('read + data URIs', async () => {
		const images = [new Uint8Array(3), new Uint8Array(2), new Uint8Array(1)];
		const uris = images.map((image) => {
			return 'data:image/png;base64,' + Buffer.from(image).toString('base64');
		});

		mockWindow('https://www.example.com/test');
		const fetchedPaths = mockFetch({
			arrayBuffer: () => {
				return toArrayBuffer(
					BufferUtils.encodeText(
						JSON.stringify({
							asset: { version: '2.0' },
							images: uris.map((uri) => ({ uri })),
						}),
					),
				);
			},
			text: () => {
				throw new Error('Do not call.');
			},
		});

		const io = new WebIO();

		const document = await io.read('test.gltf');
		const textures = document.getRoot().listTextures();

		deepEqual(fetchedPaths, ['test.gltf'], 'one network request');
		strictEqual(textures.length, 3, 'reads a textures from Data URIs');
		deepEqual(Array.from(textures[0].getImage()), Array.from(images[0]), 'reads texture 0');
		deepEqual(Array.from(textures[1].getImage()), Array.from(images[1]), 'reads texture 1');
		deepEqual(Array.from(textures[2].getImage()), Array.from(images[2]), 'reads texture 2');
	});

	test('readJSON + data URIs', async () => {
		const images = [new Uint8Array(3), new Uint8Array(2), new Uint8Array(1)];
		const uris = images.map((image) => {
			return 'data:image/png;base64,' + Buffer.from(image).toString('base64');
		});

		mockWindow('https://www.example.com/test');
		const fetchedPaths = mockFetch({
			arrayBuffer: () => {
				throw new Error('Do not call.');
			},
			text: () => {
				throw new Error('Do not call.');
			},
			json: () => () => {
				throw new Error('Do not call.');
			},
		});

		const io = new WebIO();

		const document = await io.readJSON({
			json: {
				asset: { version: '2.0' },
				images: uris.map((uri) => ({ uri })),
			},
			resources: {},
		});
		const textures = document.getRoot().listTextures();

		deepEqual(fetchedPaths, [], 'no network requests');
		strictEqual(textures.length, 3, 'reads a textures from Data URIs');
		deepEqual(Array.from(textures[0].getImage()), Array.from(images[0]), 'reads texture 0');
		deepEqual(Array.from(textures[1].getImage()), Array.from(images[1]), 'reads texture 1');
		deepEqual(Array.from(textures[2].getImage()), Array.from(images[2]), 'reads texture 2');
	});

	test('read + blob URIs', async () => {
		mockWindow('https://www.example.com/test');
		mockFetch({
			arrayBuffer: () => BufferUtils.createBufferFromDataURI(SAMPLE_GLB),
			text: () => {
				throw new Error('Do not call.');
			},
			json: () => {
				throw new Error('Do not call.');
			},
		});

		const io = new WebIO();
		const document = await io.read('blob:nonsense');
		strictEqual(document.getRoot().listBuffers().length, 1, 'reads a GLB from Blob URI');
	});
});

function toArrayBuffer(view: Uint8Array): Uint8Array {
	return view.slice(view.byteOffset, view.byteLength);
}
