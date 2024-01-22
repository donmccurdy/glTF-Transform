import { Size, Task } from '../constants';
import { createLargeDocument } from '../utils';

const createSM: Task = ['create::sm', () => createLargeDocument(Size.SM), {}];
const createMD: Task = ['create::md', () => createLargeDocument(Size.MD), {}];

export const tasks = [createSM, createMD];
