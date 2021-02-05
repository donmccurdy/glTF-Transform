require('source-map-support').install();

import path from 'path';
import gl from 'gl';
import test from 'tape';
import { NodeIO } from '@gltf-transform/core';
import { ao } from '../';

test('@gltf-transform/lib::ao', t => {
	const io = new NodeIO();
	const doc = io.read(path.join(__dirname, 'in/chr_knight.glb'));
	const root = doc.getRoot();
	const primitive = root.listMeshes()[0].listPrimitives()[0];
	const material = primitive.getMaterial();

	t.notOk(material.getOcclusionTexture(), 'begins without occlusionTexture');
	t.notOk(primitive.getAttribute('TEXCOORD_1'), 'begins without TEXCOORD_1');
	t.equals(root.listTextures().length, 1, 'begins with one texture');

	ao({gl})(doc);

	t.ok(material.getOcclusionTexture(), 'adds occlusionTexture');
	t.ok(primitive.getAttribute('TEXCOORD_1'), 'adds TEXCOORD_1');
	t.equals(root.listTextures().length, 2, 'adds texture');

	t.end();
});
