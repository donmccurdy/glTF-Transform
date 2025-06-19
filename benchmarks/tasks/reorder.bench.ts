import { Document } from '@gltf-transform/core';
import { reorder } from '@gltf-transform/functions';
import { createTorusKnotPrimitive } from '@gltf-transform/test-utils';
import { MeshoptEncoder } from 'meshoptimizer';
import type { Task } from '../constants';
import { BENCHMARK_LOGGER } from '../utils';

let _document: Document;

export const tasks: Task[] = [
	[
		'reorder',
		async () => {
			await _document.transform(reorder({ encoder: MeshoptEncoder }));
		},
		{ beforeEach: () => void (_document = createDocument(75, 64, 64)) }, // ~4000 vertices / prim
	],
];

function createDocument(primCount: number, radialSegments: number, tubularSegments: number): Document {
	const document = new Document().setLogger(BENCHMARK_LOGGER);

	const scene = document.createScene();
	for (let i = 0; i < primCount; i++) {
		const prim = createTorusKnotPrimitive(document, { radialSegments, tubularSegments });
		const mesh = document.createMesh().addPrimitive(prim);
		const node = document.createNode().setMesh(mesh);
		scene.addChild(node);
	}

	return document;
}
