import { Document } from '@gltf-transform/core';
import { Size, Task } from '../constants';
import { createLargeDocument } from '../utils';

let _document: Document;

export const tasks: Task[] = [
	['clone::sm', () => _document.clone(), { beforeAll: () => void (_document = createLargeDocument(Size.SM)) }],
	['clone::md', () => _document.clone(), { beforeAll: () => void (_document = createLargeDocument(Size.MD)) }],
];
