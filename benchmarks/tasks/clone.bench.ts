import { Document } from '@gltf-transform/core';
import { cloneDocument } from '@gltf-transform/functions';
import { Size, Task } from '../constants';
import { createLargeDocument } from '../utils';

let _document: Document;

export const tasks: Task[] = [
	['clone', () => cloneDocument(_document), { beforeAll: () => void (_document = createLargeDocument(Size.SM)) }],
];
