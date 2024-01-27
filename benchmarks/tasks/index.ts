import { Task } from '../constants.js';
import { tasks as createTasks } from './clone.bench.js';
import { tasks as cloneTasks } from './create.bench.js';
import { tasks as disposeTasks } from './dispose.bench.js';
import { tasks as joinTasks } from './join.bench.js';
import { tasks as weldTasks } from './weld.bench.js';

export const tasks: Task[] = [...createTasks, ...cloneTasks, ...disposeTasks, ...joinTasks, ...weldTasks];
