import { Size, Task } from '../constants';
import { createLargeDocument } from '../utils';

const createMD: Task = ['create', () => createLargeDocument(Size.MD), {}];

export const tasks = [createMD];
