import { Document } from '@gltf-transform/core';
import { unwrap } from '@gltf-transform/functions';
import { createTorusKnotPrimitive } from '@gltf-transform/test-utils';
import { Task } from '../constants';
import { LOGGER } from '../utils';
import * as watlas from 'watlas';

let _document: Document;

export const tasks: Task[] = [
	[
		'unwrap',
		async () => {
			await _document.transform(unwrap({ watlas, overwrite: true, groupBy: 'scene' }));
		},
		{
			beforeAll: async () => watlas.Initialize(),
			beforeEach: () => void (_document = createDocument(10, 10, 8)), // ~100 vertices / prim
		},
	],
];

function createDocument(primCount: number, radialSegments: number, tubularSegments: number): Document {
	const document = new Document().setLogger(LOGGER);

	const scene = document.createScene();
	for (let i = 0; i < primCount; i++) {
		const prim = createTorusKnotPrimitive(document, { radialSegments, tubularSegments });
		const mesh = document.createMesh().addPrimitive(prim);
		const node = document.createNode().setMesh(mesh);
		scene.addChild(node);
	}

	return document;
}
