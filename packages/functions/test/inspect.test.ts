import { ok, strictEqual } from 'node:assert/strict';
import path from 'node:path';
import { describe, test } from 'node:test';
import { NodeIO } from '@gltf-transform/core';
import { inspect } from '@gltf-transform/functions';
import { logger } from '@gltf-transform/test-utils';

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
});
