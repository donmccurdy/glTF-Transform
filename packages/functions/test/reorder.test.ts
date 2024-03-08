import test from 'ava';
import { Accessor, Document, GLTF, Primitive } from '@gltf-transform/core';
import { reorder } from '@gltf-transform/functions';
import { logger } from '@gltf-transform/test-utils';
import { MeshoptEncoder } from 'meshoptimizer';

const CUBE_INDICES = new Uint32Array([4, 2, 5, 3, 1, 4, 0, 1, 3, 1, 2, 4]);

const CUBE_INDICES_EXPECTED = new Uint32Array([0, 1, 2, 3, 1, 0, 4, 3, 0, 5, 3, 4]);

const CUBE_POSITIONS = new Float32Array([
	0.0, 0.0, 1.0, 0.0, 0.0, -1.0, 0.0, 1.0, 0.0, 0.0, -1.0, 0.0, 1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
]);

const CUBE_POSITIONS_EXPECTED = new Float32Array(CUBE_POSITIONS.length);
const REMAP = [5, 3, 1, 4, 0, 2];
for (let i = 0; i < CUBE_POSITIONS.length; i++) {
	CUBE_POSITIONS_EXPECTED[REMAP[i] * 3 + 0] = CUBE_POSITIONS[i * 3 + 0];
	CUBE_POSITIONS_EXPECTED[REMAP[i] * 3 + 1] = CUBE_POSITIONS[i * 3 + 1];
	CUBE_POSITIONS_EXPECTED[REMAP[i] * 3 + 2] = CUBE_POSITIONS[i * 3 + 2];
}

test('no indices', async (t) => {
	// Without indices, don't reorder. Need a lossy weld first.
	const doc = new Document().setLogger(logger);
	const root = doc.getRoot();
	const position1 = createFloatAttribute(doc, 'POSITION', Accessor.Type.VEC3, CUBE_POSITIONS);
	const prim1 = root.listMeshes()[0].listPrimitives()[0];

	await doc.transform(reorder({ encoder: MeshoptEncoder }));

	t.truthy(prim1.getIndices() === null && prim1.getAttribute('POSITION') === position1, 'primitive unchanged');
	t.truthy(!position1.isDisposed(), 'positions not disposed');
	t.deepEqual(position1.getArray(), CUBE_POSITIONS, 'positions unchanged');
});

test('shared indices', async (t) => {
	// With shared indices and unshared attributes, indices should be cloned.
	const doc = new Document().setLogger(logger);
	const root = doc.getRoot();
	const indices = doc.createAccessor().setType('SCALAR').setArray(CUBE_INDICES);
	const position1 = createFloatAttribute(doc, 'POSITION', Accessor.Type.VEC3, CUBE_POSITIONS);
	const position2 = createFloatAttribute(doc, 'POSITION', Accessor.Type.VEC3, CUBE_POSITIONS);
	const prim1 = root.listMeshes()[0].listPrimitives()[0].setIndices(indices);
	const prim2 = root.listMeshes()[1].listPrimitives()[0].setIndices(indices);

	await doc.transform(reorder({ encoder: MeshoptEncoder }));

	t.truthy(indices !== prim1.getIndices(), 'indices #1 cloned');
	t.truthy(indices !== prim2.getIndices(), 'indices #2 cloned');
	t.truthy(prim1.getIndices() === prim2.getIndices(), 'indices shared');
	t.truthy(prim1.getAttribute('POSITION') !== prim2.getAttribute('POSITION'), 'positions remain unshared');
	t.truthy(indices.isDisposed(), 'original indices disposed');
	t.truthy(position1.isDisposed(), 'original positions #1 disposed');
	t.truthy(position2.isDisposed(), 'original positions #2 disposed');
	t.deepEqual(Array.from(prim1.getIndices().getArray()), Array.from(CUBE_INDICES_EXPECTED), 'indices reordered');
	t.deepEqual(
		Array.from(prim1.getAttribute('POSITION').getArray()),
		Array.from(CUBE_POSITIONS_EXPECTED),
		'positions #1 reordered',
	);
	t.deepEqual(
		Array.from(prim2.getAttribute('POSITION').getArray()),
		Array.from(CUBE_POSITIONS_EXPECTED),
		'positions #2 reordered',
	);
});

test('shared attributes', async (t) => {
	// With shared attributes and unshared indices, attributes should be truncated.
	const doc = new Document().setLogger(logger);
	const root = doc.getRoot();
	const indices1 = doc.createAccessor().setType('SCALAR').setArray(CUBE_INDICES.slice(0, 6));
	const indices2 = doc.createAccessor().setType('SCALAR').setArray(CUBE_INDICES.slice(6, 9));
	const indices3 = doc.createAccessor().setType('SCALAR').setArray(CUBE_INDICES.slice(9, 12));
	const position = createFloatAttribute(doc, 'POSITION', Accessor.Type.VEC3, CUBE_POSITIONS);
	const mesh = root.listMeshes()[0];
	const prim1 = mesh.listPrimitives()[0].setIndices(indices1);
	const prim2 = prim1.clone().setIndices(indices2);
	const prim3 = prim1.clone().setIndices(indices3);
	mesh.addPrimitive(prim2).addPrimitive(prim3);

	await doc.transform(reorder({ encoder: MeshoptEncoder }));

	t.truthy(indices1.isDisposed() && indices2.isDisposed() && indices3.isDisposed(), 'indices disposed');
	t.truthy(position.isDisposed(), 'positions disposed');
	t.deepEqual(prim1.getIndices().getCount(), 6, 'indices #1 reordered');
	t.deepEqual(prim2.getIndices().getCount(), 3, 'indices #2 reordered');
	t.deepEqual(prim3.getIndices().getCount(), 3, 'indices #3 reordered');
	t.deepEqual(prim1.getAttribute('POSITION').getCount(), 5, 'positions #1 truncated');
	t.deepEqual(prim2.getAttribute('POSITION').getCount(), 3, 'positions #2 truncated');
	t.deepEqual(prim3.getAttribute('POSITION').getCount(), 3, 'positions #3 truncated');
});

test('morph targets', async (t) => {
	// With shared indices and unshared attributes, indices should be cloned.
	const doc = new Document().setLogger(logger);
	const root = doc.getRoot();
	const indices = doc.createAccessor().setType('SCALAR').setArray(CUBE_INDICES);
	const position1 = createFloatAttribute(doc, 'POSITION', Accessor.Type.VEC3, CUBE_POSITIONS);
	const position2 = createFloatAttribute(
		doc,
		'_TMP',
		Accessor.Type.VEC3,
		new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 2.0, 0.0, 0.0, 3.0, 0.0, 0.0, 4.0, 0.0, 0.0, 5.0, 0.0, 0.0, 6.0]),
	);
	const target = doc.createPrimitiveTarget().setAttribute('POSITION', position2.detach());
	const prim = root.listMeshes()[0].listPrimitives()[0].setIndices(indices);
	prim.addTarget(target);

	await doc.transform(reorder({ encoder: MeshoptEncoder }));

	t.truthy(indices !== prim.getIndices(), 'indices #1 cloned');
	t.truthy(indices.isDisposed(), 'original indices disposed');
	t.truthy(position1.isDisposed(), 'original positions disposed');
	t.truthy(position2.isDisposed(), 'original morph positions disposed');
	t.deepEqual(Array.from(prim.getIndices().getArray()), Array.from(CUBE_INDICES_EXPECTED), 'indices reordered');
	t.deepEqual(
		Array.from(prim.getAttribute('POSITION').getArray()),
		Array.from(CUBE_POSITIONS_EXPECTED),
		'positions reordered',
	);

	t.deepEqual(
		Array.from(target.getAttribute('POSITION').getArray()),
		[0, 0, 5.0, 0, 0, 3.0, 0, 0, 6.0, 0, 0, 2.0, 0, 0, 4.0, 0, 0, 1.0],
		'morph positions reordered',
	);
});

test('no side effects', async (t) => {
	const document = new Document().setLogger(logger);
	const attributeA = document.createAccessor().setType('VEC3').setArray(new Float32Array(9));
	attributeA.clone();

	await document.transform(reorder({ cleanup: false, encoder: MeshoptEncoder }));

	t.is(document.getRoot().listAccessors().length, 2, 'skips prune and dedup');
});

/* UTILITIES */

/** Builds a new float32 attribute for given type and data. */
function createFloatAttribute(doc: Document, semantic: string, type: GLTF.AccessorType, array: Float32Array): Accessor {
	const attribute = doc.createAccessor().setType(type).setArray(array);
	const prim = doc.createPrimitive().setAttribute(semantic, attribute).setMode(Primitive.Mode.TRIANGLES);
	doc.createMesh().addPrimitive(prim);
	return attribute;
}
