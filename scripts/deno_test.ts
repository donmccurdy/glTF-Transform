import { assert, assertEquals } from 'https://deno.land/std@0.178.0/testing/asserts.ts';
import { DenoIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import path from 'node:path';

Deno.test('@gltf-transform/core::deno | read', async () => {
	const io = new DenoIO(path).registerExtensions(ALL_EXTENSIONS);
	const document = await io.read('packages/core/test/in/BoxVertexColors.glb');
	assert(document, 'reads document');
	assertEquals(document.getRoot().listScenes().length, 1, 'reads 1 scene');
});
