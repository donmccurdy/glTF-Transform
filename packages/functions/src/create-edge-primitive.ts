import { Document, Primitive, Triangle, type vec3 } from '@gltf-transform/core';
import { vec3 as glvec3 } from 'gl-matrix';
import { dequantizeAttribute } from './dequantize.js';
import { VertexStream } from './hash-table.js';

const NAME = 'primitive-outline';

export interface PrimitiveOutlineOptions {
	thresholdAngel: number;
}

export const PRIMITIVE_OUTLINE_DEFAULTS: Required<PrimitiveOutlineOptions> = {
	thresholdAngel: 0.05,
};

export function createEdgePrimitive(prim: Primitive, thresholdRadians: number): Primitive {
	const graph = prim.getGraph();
	const document = Document.fromGraph(graph)!;
	const positionAccessor = prim.getAttribute('POSITION');

	if (
		document
			.getRoot()
			.listExtensionsUsed()
			.some((ext) => ext.extensionName === 'KHR_mesh_quantization')
	) {
		for (const semantic of ['POSITION', 'NORMAL', 'TANGENT']) {
			const attribute = prim.getAttribute(semantic);
			if (attribute) dequantizeAttribute(attribute);
		}
	}
	const indices = prim.getIndices()?.getArray();
	const indexCount = indices ? indices.length : positionAccessor?.getCount();
	const precisionCount = 4;
	const precision = Math.pow(10, precisionCount);

	const indexArr = [0, 0, 0];
	const vertKeys = ['a', 'b', 'c'];
	const triangle = new Triangle();
	const hashes = new Array(3);
	const edgeData = {};
	const vertices = [];
	const vertexStream = new VertexStream(prim);

	for (let i = 0; i < indexCount; i += 3) {
		if (indices) {
			indexArr[0] = indices[i * 3 + 0];
			indexArr[1] = indices[i * 3 + 1];
			indexArr[2] = indices[i * 3 + 2];
		} else {
			indexArr[0] = i * 3 + 0;
			indexArr[1] = i * 3 + 1;
			indexArr[2] = i * 3 + 2;
		}
		const a = [] as vec3;
		positionAccessor.getElement(indexArr[0], a);
		const b = [] as vec3;
		positionAccessor.getElement(indexArr[1], b);
		const c = [] as vec3;
		positionAccessor.getElement(indexArr[2], c);
		const _triangle = new Triangle(a, b, c);
		const normal = [0, 0, 0] as vec3;
		Triangle.getNormal(a, b, c, normal);

		hashes[0] = vertexStream.hash(indexArr[0]);
		hashes[1] = vertexStream.hash(indexArr[1]);
		hashes[2] = vertexStream.hash(indexArr[2]);

		// skip degenerate triangles
		if (hashes[0] === hashes[1] || hashes[1] === hashes[2] || hashes[2] === hashes[0]) {
			continue;
		}

		for (let j = 0; j < 3; j++) {
			const jNext = (j + 1) % 3;
			const vecHash0 = hashes[j];
			const vecHash1 = hashes[jNext];
			const v0 = _triangle[vertKeys[j]];
			const v1 = _triangle[vertKeys[jNext]];
			const hash = `${vecHash0}_${vecHash1}`;
			const reverseHash = `${vecHash1}_${vecHash0}`;
			if (reverseHash in edgeData && edgeData[reverseHash]) {
				// if we found a sibling edge add it into the vertex array if
				// it meets the angle threshold and delete the edge from the map.
				if (glvec3.dot(normal, edgeData[reverseHash].normal) <= thresholdRadians) {
					vertices.push(v0[0], v0[1], v0[2]);
					vertices.push(v1[0], v1[1], v1[2]);
				}

				edgeData[reverseHash] = null;
			} else if (!(hash in edgeData)) {
				// if we've already got an edge here then skip adding a new one
				edgeData[hash] = {
					index0: indexArr[j],
					index1: indexArr[jNext],
					normal: glvec3.clone(normal),
				};
			}
		}
	}

	// iterate over all remaining, unmatched edges and add them to the vertex array
	for (const key in edgeData) {
		if (edgeData[key]) {
			const { index0, index1 } = edgeData[key];
			const v0 = [] as vec3;
			positionAccessor.getElement(index0, v0);
			const v1 = [] as vec3;
			positionAccessor.getElement(index1, v1);

			vertices.push(v0[0], v0[1], v0[2]);
			vertices.push(v1[0], v1[1], v1[2]);
		}
	}

	const accesor = document
		.createAccessor()
		.setArray(new Float32Array(vertices))
		.setType('VEC3')
		.setBuffer(positionAccessor.getBuffer());

	const edgePrim = document
		.createPrimitive()
		.setName(prim.getName() + '_edges')
		.setMode(Primitive.Mode.LINES)
		.setAttribute('POSITION', accesor);

	return edgePrim;
}
