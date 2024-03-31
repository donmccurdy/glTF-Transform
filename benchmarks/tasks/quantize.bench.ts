import { Document } from '@gltf-transform/core';
import { quantize } from '@gltf-transform/functions';
import { createTorusKnotPrimitive } from '@gltf-transform/test-utils';
import { Task } from '../constants';
import { LOGGER } from '../utils';

let _document: Document;

export const tasks: Task[] = [
	[
		'quantize',
		async () => {
			await _document.transform(quantize());
		},
		{
			beforeEach: () => {
				// ~250,000 vertices / prim
				_document = new Document().setLogger(LOGGER);
				const prim = createTorusKnotPrimitive(_document, { radialSegments: 512, tubularSegments: 512 });
				const mesh = _document.createMesh().addPrimitive(prim);
				const node = _document.createNode().setMesh(mesh);
				_document.createScene().addChild(node);
			},
		},
	],
];
