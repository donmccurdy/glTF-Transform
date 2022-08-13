require('source-map-support').install();

import test from 'tape';
import { bbox, Document, Logger, Primitive, PrimitiveTarget, vec3 } from '@gltf-transform/core';
import { fromScaling, fromTranslation, fromRotation, identity } from 'gl-matrix/mat4';
import { transformMesh, transformPrimitive } from '../';

const logger = new Logger(Logger.Verbosity.SILENT);

test.skip('@gltf-transform/functions::transformMesh', async (t) => {
	// TODO(impl): todo - test primitive overwrite, cloning, ...
});

test('@gltf-transform/functions::transformMesh', async (t) => {
	const document = new Document().setLogger(logger);

	const prim = createPrimitive(document);

	transformPrimitive(prim, identity([]));
	t.deepEquals(primBounds(prim), { min: [-0.5, 10, -0.5], max: [0.5, 10, 0.5] }, 'identity');

	transformPrimitive(prim, fromScaling([], [2, 1, 2]));
	t.deepEquals(primBounds(prim), { min: [-1, 10, -1], max: [1, 10, 1] }, 'scale');

	transformPrimitive(prim, fromTranslation([], [0, -10, 0]));
	t.deepEquals(primBounds(prim), { min: [-1, 0, -1], max: [1, 0, 1] }, 'translate');

	transformPrimitive(prim, fromRotation([], Math.PI / 2, [1, 0, 0]));
	t.deepEquals(roundBbox(primBounds(prim)), { min: [-1, -1, 0], max: [1, 1, 0] }, 'rotate');

	t.end();
});

/* UTILITIES */

/** Creates a rounding function for given decimal precision. */
function round(decimals = 4): (v: number) => number {
	const f = Math.pow(10, decimals);
	return (v: number) => {
		v = Math.round(v * f) / f;
		v = Object.is(v, -0) ? 0 : v;
		return v;
	};
}

function roundBbox(bbox: bbox, decimals = 4): bbox {
	return {
		min: bbox.min.map(round(decimals)) as vec3,
		max: bbox.max.map(round(decimals)) as vec3,
	};
}

function primBounds(prim: Primitive | PrimitiveTarget): bbox {
	return {
		min: prim.getAttribute('POSITION')!.getMinNormalized([]) as vec3,
		max: prim.getAttribute('POSITION')!.getMaxNormalized([]) as vec3,
	};
}

function createPrimitive(document: Document): Primitive {
	const prim = document
		.createPrimitive()
		.setMode(Primitive.Mode.POINTS)
		.setAttribute(
			'POSITION',
			// prettier-ignore
			document
				.createAccessor('POSITION')
				.setType('VEC3')
				.setArray(new Float32Array([
					0.5, 10, 0.5,
					0.5, 10, -0.5,
					-0.5, 10, -0.5,
					-0.5, 10, 0.5,
				]))
		)
		.setAttribute(
			'NORMAL',
			// prettier-ignore
			document
				.createAccessor('NORMAL')
				.setType('VEC3')
				.setArray(
					new Float32Array([
						0, 1, 0,
						0, 1, 0,
						0, 1, 0,
						0, 1, 0,
					])
				)
		)
		.setAttribute(
			'TANGENT',
			// prettier-ignore
			document
				.createAccessor('TANGENT')
				.setType('VEC4')
				.setArray(
					new Float32Array([
						1, 0, 0, 1,
						1, 0, 0, 1,
						1, 0, 0, 1,
						1, 0, 0, 1,
					])
				)
		);
	return prim;
}
