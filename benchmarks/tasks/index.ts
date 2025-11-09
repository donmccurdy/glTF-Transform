import type { Task } from '../constants.ts';
import { tasks as createTasks } from './clone.bench.ts';
import { tasks as cloneTasks } from './create.bench.ts';
import { tasks as dedupTasks } from './dedup.bench.ts';
import { tasks as dequantizeTasks } from './dequantize.bench.ts';
import { tasks as disposeTasks } from './dispose.bench.ts';
import { tasks as flattenTasks } from './flatten.bench.ts';
import { tasks as joinTasks } from './join.bench.ts';
import { tasks as quantizeTasks } from './quantize.bench.ts';
import { tasks as reorderTasks } from './reorder.bench.ts';
import { tasks as unwrapTasks } from './unwrap.bench.ts';
import { tasks as weldTasks } from './weld.bench.ts';

export const tasks: Task[] = [
	...createTasks,
	...cloneTasks,
	...dedupTasks,
	...dequantizeTasks,
	...disposeTasks,
	...flattenTasks,
	...joinTasks,
	...quantizeTasks,
	...reorderTasks,
	...unwrapTasks,
	...weldTasks,
];
