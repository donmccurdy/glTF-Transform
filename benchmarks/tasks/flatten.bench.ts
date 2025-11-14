import type { Document } from '@gltf-transform/core';
import { flatten } from '@gltf-transform/functions';
import { Size, type Task } from '../constants.ts';
import { createLargeDocument } from '../utils.ts';

let _document: Document;

export const tasks: Task[] = [
	[
		'flatten',
		async () => {
			await _document.transform(flatten());
		},
		{
			beforeEach: () => {
				_document = createLargeDocument(Size.LG);
			},
		},
	],
];
