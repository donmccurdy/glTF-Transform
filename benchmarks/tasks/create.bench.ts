import { Size, type Task } from '../constants.ts';
import { createLargeDocument } from '../utils.ts';

const createMD: Task = ['create', () => createLargeDocument(Size.MD), {}];

export const tasks = [createMD];
