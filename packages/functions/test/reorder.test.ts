require('source-map-support').install();

import test from 'tape';
import { Accessor, Document, GLTF, Logger, Primitive } from '@gltf-transform/core';
import { reorder } from '../';
import { MeshoptEncoder } from 'meshoptimizer';

// TODO cases:
// - [x] no indices, no effect
// - [x] same attributes, many indices
// - [ ] same indices, many attributes
// - [ ] morph targets

const CUBE_INDICES = new Uint32Array([
	4, 2, 5,
	3, 1, 4,
	0, 1, 3,
	1, 2, 4,
]);

const CUBE_INDICES_EXPECTED = new Uint32Array([
	0, 1, 2,
	3, 1, 0,
	4, 3, 0,
	5, 3, 4,
]);

const CUBE_POSITIONS = new Float32Array([
	0.00, 0.00, 1.00,
	0.00, 0.00, -1.00,
	0.00, 1.00, 0.00,
	0.00, -1.00, 0.00,
	1.00, 0.00, 0.00,
	-1.00, 0.00, 0.00,
]);

const CUBE_POSITIONS_EXPECTED = new Float32Array(CUBE_POSITIONS.length);
const REMAP = [5, 3, 1, 4, 0, 2];
for (let i = 0; i < CUBE_POSITIONS.length; i++) {
	CUBE_POSITIONS_EXPECTED[REMAP[i] * 3 + 0] = CUBE_POSITIONS[i * 3 + 0];
	CUBE_POSITIONS_EXPECTED[REMAP[i] * 3 + 1] = CUBE_POSITIONS[i * 3 + 1];
	CUBE_POSITIONS_EXPECTED[REMAP[i] * 3 + 2] = CUBE_POSITIONS[i * 3 + 2];
}

const logger = new Logger(Logger.Verbosity.SILENT);

test('@gltf-transform/functions::reorder | no indices', async t => {
	// Without indices, don't reorder. Need a lossy weld first.
	const doc = new Document().setLogger(logger);
	const root = doc.getRoot();
	const position1 = createFloatAttribute(doc, 'POSITION', Accessor.Type.VEC3, CUBE_POSITIONS);
	const prim1 = root.listMeshes()[0].listPrimitives()[0];

	await doc.transform(reorder({encoder: MeshoptEncoder}));

	t.ok(
		prim1.getIndices() === null
		&& prim1.getAttribute('POSITION') === position1,
		'primitive unchanged'
	);
	t.ok(!position1.isDisposed(), 'positions not disposed');
	t.deepEquals(position1.getArray(), CUBE_POSITIONS, 'positions unchanged');
	t.end();
});

test('@gltf-transform/functions::reorder | shared indices', async t => {
	// With shared indices and unshared attributes, indices should be cloned.
	const doc = new Document().setLogger(logger);
	const root = doc.getRoot();
	const indices = doc.createAccessor()
		.setType('SCALAR')
		.setArray(CUBE_INDICES);
	const position1 = createFloatAttribute(doc, 'POSITION', Accessor.Type.VEC3, CUBE_POSITIONS);
	const position2 = createFloatAttribute(doc, 'POSITION', Accessor.Type.VEC3, CUBE_POSITIONS);
	const prim1 = root.listMeshes()[0].listPrimitives()[0].setIndices(indices);
	const prim2 = root.listMeshes()[1].listPrimitives()[0].setIndices(indices);

	await doc.transform(reorder({encoder: MeshoptEncoder}));

	t.ok(indices !== prim1.getIndices(), 'indices #1 cloned');
	t.ok(indices !== prim2.getIndices(), 'indices #2 cloned');
	t.ok(prim1.getIndices() === prim2.getIndices(), 'indices shared');
	t.ok(
		prim1.getAttribute('POSITION') !== prim2.getAttribute('POSITION'),
		'positions remain unshared'
	);
	t.ok(indices.isDisposed(), 'original indices disposed');
	t.ok(position1.isDisposed(), 'original positions #1 disposed');
	t.ok(position2.isDisposed(), 'original positions #2 disposed');
	t.deepEquals(
		Array.from(prim1.getIndices().getArray()),
		Array.from(CUBE_INDICES_EXPECTED),
		'indices reordered'
	);
	t.deepEquals(
		Array.from(prim1.getAttribute('POSITION').getArray()),
		Array.from(CUBE_POSITIONS_EXPECTED),
		'positions #1 reordered'
	);
	t.deepEquals(
		Array.from(prim2.getAttribute('POSITION').getArray()),
		Array.from(CUBE_POSITIONS_EXPECTED),
		'positions #2 reordered'
	);
	t.end();
});

/* UTILITIES */

/** Builds a new float32 attribute for given type and data. */
function createFloatAttribute(
		doc: Document,
		semantic: string,
		type: GLTF.AccessorType,
		array: Float32Array): Accessor {
	const attribute = doc.createAccessor()
		.setType(type)
		.setArray(array);
	const prim = doc.createPrimitive()
		.setAttribute(semantic, attribute)
		.setMode(Primitive.Mode.TRIANGLES);
	doc.createMesh().addPrimitive(prim);
	return attribute;
}
