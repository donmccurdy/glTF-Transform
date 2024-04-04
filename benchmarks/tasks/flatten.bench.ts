import { Document } from '@gltf-transform/core';
import { flatten } from '@gltf-transform/functions';
import { Size, Task } from '../constants';
import { createLargeDocument } from '../utils';

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
