import { Document } from '@gltf-transform/core';
import { weld } from '@gltf-transform/functions';
import { Task } from '../constants';
import { LOGGER, createTorusKnotPrimitive } from '../utils';

let _document: Document;

export const tasks: Task[] = [
	[
		'weld::sm',
		async () => {
			await _document.transform(weld());
		},
		{ beforeEach: () => void (_document = createTorusKnotDocument(64, 64)) }, // ~4000 vertices
	],
	[
		'weld::md',
		async () => {
			await _document.transform(weld());
		},
		{ beforeEach: () => void (_document = createTorusKnotDocument(512, 512)) }, // ~250,000 vertices
	],
];

function createTorusKnotDocument(radialSegments: number, tubularSegments: number): Document {
	const document = new Document().setLogger(LOGGER);
	const prim = createTorusKnotPrimitive(document, { radialSegments, tubularSegments });
	const mesh = document.createMesh().addPrimitive(prim);
	const node = document.createNode().setMesh(mesh);
	document.createScene().addChild(node);
	return document;
}
