import { ok, strictEqual } from 'node:assert/strict';
import { test } from 'node:test';
import { Document, Primitive as PrimitiveDef } from '@gltf-transform/core';
import { DocumentView, NullImageProvider } from '@gltf-transform/view';
import { JSDOM } from 'jsdom';
import type { MeshStandardMaterial } from 'three';

global.document = new JSDOM().window.document;
const imageProvider = new NullImageProvider();

test('PrimitiveSubject', async () => {
	const document = new Document();
	const position = document
		.createAccessor()
		.setType('VEC3')
		.setArray(new Float32Array([0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0]));
	const materialDef = document.createMaterial('MyMaterial');
	const primDef = document.createPrimitive().setAttribute('POSITION', position).setMaterial(materialDef);

	const documentView = new DocumentView(document, { imageProvider });
	let prim = documentView.view(primDef);
	const geometry = prim.geometry;

	const disposed = new Set();
	geometry.addEventListener('dispose', () => disposed.add(geometry));

	strictEqual(prim.type, 'Mesh', 'Mesh');

	primDef.setMode(PrimitiveDef.Mode.POINTS);
	prim = documentView.view(primDef);

	strictEqual(prim.type, 'Points', 'Points');

	primDef.setMode(PrimitiveDef.Mode.LINES);
	prim = documentView.view(primDef);

	strictEqual(prim.type, 'LineSegments', 'LineSegments');

	primDef.setMode(PrimitiveDef.Mode.LINE_LOOP);
	prim = documentView.view(primDef);

	strictEqual(prim.type, 'LineLoop', 'LineLoop');

	primDef.setMode(PrimitiveDef.Mode.LINE_STRIP);
	prim = documentView.view(primDef);

	strictEqual(prim.type, 'Line', 'Line');

	strictEqual(prim.material.name, 'MyMaterial', 'prim.material → material');

	primDef.setMaterial(null);

	strictEqual(prim.material.name, '__DefaultMaterial', 'prim.material → null');

	strictEqual(disposed.size, 0, 'preserve geometry');

	primDef.dispose();

	strictEqual(disposed.size, 1, 'dispose geometry');
});

// https://github.com/donmccurdy/glTF-Transform/issues/1686
// When a primitive has no material AND no NORMAL attribute, the implicit
// default material must enable flatShading so the mesh is not rendered black.
// Per the glTF spec, flat normals are expected here; three.js derives them in
// the shader when flatShading is enabled, so no vertex normals are written.
test('PrimitiveSubject · default material · no NORMAL → flatShading (issue #1686)', async () => {
	const document = new Document();
	const position = document
		.createAccessor()
		.setType('VEC3')
		.setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]));
	// No NORMAL attribute, no material set.
	const primDef = document.createPrimitive().setAttribute('POSITION', position);

	const documentView = new DocumentView(document, { imageProvider });
	const prim = documentView.view(primDef);

	strictEqual(prim.material.name, '__DefaultMaterial', 'prim.material → default');
	const material = prim.material as MeshStandardMaterial;
	ok(material.flatShading === true, 'default material must have flatShading=true');

	// The default material is shared across primitives, so toggling NORMAL must
	// flip flatShading (the helper also flags the material with needsUpdate so
	// already-compiled shader programs pick up the new shading mode).
	const normal = document
		.createAccessor()
		.setType('VEC3')
		.setArray(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]));

	primDef.setAttribute('NORMAL', normal);
	ok(material.flatShading === false, 'smooth shading while NORMAL is present');

	primDef.setAttribute('NORMAL', null);
	ok(material.flatShading === true, 'flat shading after NORMAL removal');
});
