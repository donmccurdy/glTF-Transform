import { ok, strictEqual } from 'node:assert/strict';
import path from 'node:path';
import { describe, test } from 'node:test';
import { Document, NodeIO } from '@gltf-transform/core';
import { EXTTextureASTC } from '@gltf-transform/extensions';
import { inspect } from '@gltf-transform/functions';
import { logger } from '@gltf-transform/test-utils';
import {
	createDefaultContainer,
	KHR_DF_MODEL_ASTC,
	VK_FORMAT_ASTC_4x4_UNORM_BLOCK,
	write as writeKTX,
} from 'ktx-parse';

describe('functions::inspect', () => {
	test('basic', async () => {
		const io = new NodeIO();
		const doc = await io.read(path.resolve(import.meta.dirname, 'in', 'TwoCubes.glb'));
		doc.setLogger(logger);

		doc.createAnimation('TestAnim');
		doc.createTexture('TestTex').setImage(new Uint8Array(10)).setMimeType('image/fake');

		const report = inspect(doc);

		ok(report, 'report');
		strictEqual(report.scenes.properties.length, 1, 'report.scenes');
		strictEqual(report.meshes.properties.length, 2, 'report.meshes');
		strictEqual(report.materials.properties.length, 2, 'report.materials');
		strictEqual(report.animations.properties.length, 1, 'report.animations');
		strictEqual(report.textures.properties.length, 1, 'report.textures');
	});

	test('ktx2 compression', async () => {
		EXTTextureASTC.register();

		const container = createDefaultContainer();
		container.vkFormat = VK_FORMAT_ASTC_4x4_UNORM_BLOCK;
		container.pixelWidth = 4;
		container.pixelHeight = 4;
		container.dataFormatDescriptor[0].colorModel = KHR_DF_MODEL_ASTC;
		container.levels = [{ levelData: new Uint8Array(16), uncompressedByteLength: 0 }];

		const doc = new Document().setLogger(logger);
		doc.createTexture('ASTC').setMimeType('image/ktx2').setImage(writeKTX(container));

		const [texture] = inspect(doc).textures.properties;

		strictEqual(texture.compression, 'ASTC', 'compression');
		strictEqual(texture.resolution, '4x4', 'resolution');
		strictEqual(texture.gpuSize, 16, 'gpuSize');
	});
});
