import type { Document } from '@gltf-transform/core';
import { cloneDocument } from '@gltf-transform/functions';
import { Size, type Task } from '../constants.ts';
import { createLargeDocument } from '../utils.ts';

let _document: Document;

export const tasks: Task[] = [
	['clone', () => cloneDocument(_document), { beforeAll: () => void (_document = createLargeDocument(Size.SM)) }],
];
