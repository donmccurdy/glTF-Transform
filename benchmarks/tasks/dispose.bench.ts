import { Document } from '@gltf-transform/core';
import { Size, Task } from '../constants';
import { createLargeDocument } from '../utils';

let _document: Document;

export const tasks: Task[] = [
	[
		'dispose',
		() => {
			const nodes = _document.getRoot().listNodes();
			for (let i = 0, il = Math.min(nodes.length, 100); i < il; i++) {
				nodes[i].dispose();
			}
		},
		{
			beforeEach: () => {
				_document = createLargeDocument(Size.MD);
			},
		},
	],
];
