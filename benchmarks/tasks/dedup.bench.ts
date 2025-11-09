import { Document, type Material, type Primitive, type Texture } from '@gltf-transform/core';
import { dedup } from '@gltf-transform/functions';
import { createTorusKnotPrimitive } from '@gltf-transform/test-utils';
import type { Task } from '../constants';
import { BENCHMARK_LOGGER } from '../utils';

let _document: Document;

export const tasks: Task[] = [
	[
		'dedup',
		async () => {
			await _document.transform(dedup());
		},
		{ beforeEach: () => void (_document = createDocument(1500, 5)) },
	],
];

function createDocument(resourceCount: number, uniqueCount: number): Document {
	const document = new Document().setLogger(BENCHMARK_LOGGER);

	// ~ 4000 vertices each.
	const prims: Primitive[] = [
		createTorusKnotPrimitive(document, { radialSegments: 64, tubularSegments: 50 }),
		createTorusKnotPrimitive(document, { radialSegments: 64, tubularSegments: 58 }),
		createTorusKnotPrimitive(document, { radialSegments: 64, tubularSegments: 64 }),
		createTorusKnotPrimitive(document, { radialSegments: 64, tubularSegments: 72 }),
		createTorusKnotPrimitive(document, { radialSegments: 64, tubularSegments: 80 }),
	];

	// ~ 1 MB each.
	const textures: Texture[] = [];
	for (let i = 0; i < resourceCount; i++) {
		const image = new Uint8Array(2 ** 20).fill(i % uniqueCount);
		const texture = document.createTexture().setImage(image);
		textures.push(texture);
	}

	const materials: Material[] = [];
	for (let i = 0; i < resourceCount; i++) {
		const value = i % 2 ? 0.5 : 1;
		const material = document
			.createMaterial()
			.setBaseColorFactor([value, value, value, 1])
			.setBaseColorTexture(textures[i % uniqueCount]);
		materials.push(material);
	}

	for (let i = 0; i < resourceCount; i++) {
		const material = materials[i % prims.length];
		const prim = prims[i % prims.length].clone().setMaterial(material);
		document.createMesh().addPrimitive(prim);
	}

	return document;
}
