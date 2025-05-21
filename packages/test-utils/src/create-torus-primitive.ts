import { vec3, Document, Primitive } from '@gltf-transform/core';
import { vec3 as glvec3 } from 'gl-matrix';

export interface TorusKnotOptions {
	radius?: number;
	tube?: number;
	tubularSegments?: number;
	radialSegments?: number;
	p?: number;
	q?: number;
}

export const TORUS_KNOT_DEFAULTS: Required<TorusKnotOptions> = {
	radius: 1,
	tube: 0.4,
	tubularSegments: 64,
	radialSegments: 8,
	p: 2,
	q: 3,
};

/** Based on THREE.TorusKnotGeometry. */
export function createTorusKnotPrimitive(
	document: Document,
	options: TorusKnotOptions = TORUS_KNOT_DEFAULTS,
): Primitive {
	const { radius, tube, tubularSegments, radialSegments, p, q } = { ...TORUS_KNOT_DEFAULTS, ...options };

	// buffers

	const indices: number[] = [];
	const vertices: number[] = [];
	const normals: number[] = [];
	const uvs: number[] = [];

	// helper variables

	const vertex = [0, 0, 0] as vec3;
	const normal = [0, 0, 0] as vec3;

	const P1 = [0, 0, 0] as vec3;
	const P2 = [0, 0, 0] as vec3;

	const B = [0, 0, 0] as vec3;
	const T = [0, 0, 0] as vec3;
	const N = [0, 0, 0] as vec3;

	// generate vertices, normals and uvs

	for (let i = 0; i <= tubularSegments; ++i) {
		// the radian "u" is used to calculate the position on the torus curve of the current tubular segment

		const u = (i / tubularSegments) * p * Math.PI * 2;

		// now we calculate two points. P1 is our current position on the curve, P2 is a little farther ahead.
		// these points are used to create a special "coordinate space", which is necessary to calculate the
		// correct vertex positions.

		calculatePositionOnCurve(u, p, q, radius, P1);
		calculatePositionOnCurve(u + 0.01, p, q, radius, P2);

		// calculate orthonormal basis

		glvec3.subtract(T, P2, P1);
		glvec3.add(N, P2, P1);
		glvec3.cross(B, T, N);
		glvec3.cross(N, B, T);

		// normalize B, N. T can be ignored, we don't use it

		glvec3.normalize(B, B);
		glvec3.normalize(N, N);

		for (let j = 0; j <= radialSegments; ++j) {
			// now calculate the vertices. they are nothing more than an extrusion of the torus curve.
			// because we extrude a shape in the xy-plane, there is no need to calculate a z-value.

			const v = (j / radialSegments) * Math.PI * 2;
			const cx = -tube * Math.cos(v);
			const cy = tube * Math.sin(v);

			// now calculate the final vertex position.
			// first we orient the extrusion with our basis vectors, then we add it to the current position on the curve

			vertex[0] = P1[0] + (cx * N[0] + cy + B[0]);

			vertex[1] = P1[1] + (cx * N[1] + cy + B[1]);

			vertex[2] = P1[2] + (cx * N[2] + cy + B[2]);

			vertices.push(vertex[0], vertex[1], vertex[2]);

			// normal (P1 is always the center/origin of the extrusion, thus we can use it to calculate the normal)

			glvec3.normalize(normal, glvec3.subtract(normal, vertex, P1));

			normals.push(normal[0], normal[1], normal[2]);

			// uv

			uvs.push(i / tubularSegments);
			uvs.push(j / radialSegments);
		}
	}

	// generate indices

	for (let j = 1; j <= tubularSegments; j++) {
		for (let i = 1; i <= radialSegments; i++) {
			// indices

			const a = (radialSegments + 1) * (j - 1) + (i - 1);
			const b = (radialSegments + 1) * j + (i - 1);
			const c = (radialSegments + 1) * j + i;
			const d = (radialSegments + 1) * (j - 1) + i;

			// faces

			indices.push(a, b, d);
			indices.push(b, c, d);
		}
	}

	// build geometry

	const prim = document
		.createPrimitive()
		.setIndices(document.createAccessor().setArray(new Uint32Array(indices)))
		.setAttribute('POSITION', document.createAccessor().setType('VEC3').setArray(new Float32Array(vertices)))
		.setAttribute('NORMAL', document.createAccessor().setType('VEC3').setArray(new Float32Array(normals)))
		.setAttribute('TEXCOORD_0', document.createAccessor().setType('VEC2').setArray(new Float32Array(uvs)));

	// assign buffer

	const buffer = document.getRoot().listBuffers()[0] || document.createBuffer();

	for (const attribute of prim.listAttributes()) {
		attribute.setBuffer(buffer);
	}

	return prim;
}

/** Calculates the current position on the torus curve. */
function calculatePositionOnCurve(u: number, p: number, q: number, radius: number, dst: vec3): vec3 {
	const cu = Math.cos(u);
	const su = Math.sin(u);
	const quOverP = (q / p) * u;
	const cs = Math.cos(quOverP);

	dst[0] = radius * (2 + cs) * 0.5 * cu;
	dst[1] = radius * (2 + cs) * su * 0.5;
	dst[2] = radius * Math.sin(quOverP) * 0.5;
	return dst;
}
