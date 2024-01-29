import { Bench } from 'tinybench';
import { tasks } from './tasks/index.js';

/**
 * DEVELOPER NOTES:
 *
 * Started out with benchmark.js, but quickly hit some frustrating issues.
 * Async is difficult. Setup functions are serialized and can't access scope.
 * Options on the Suite appear to do nothing. Switched to tinybench.
 */

const filter = process.argv[2];

/******************************************************************************
 * BENCHMARK SUITE
 */

const bench = new Bench({ time: 1000 });
for (const [title, fn, options] of tasks) {
	if (!filter || title.startsWith(filter)) {
		bench.add(title, fn, options);
	}
}

/******************************************************************************
 * EXECUTE
 */

await bench.run();

console.table(bench.table());

// interface IResult {
// 	name: string;
// 	value: number;
// 	unit: string;
// }

// const results: IResult[] = [];
// for (const task of bench.tasks) {
// 	results.push({
// 		name: task.name,
// 		value: Number(task.result!.mean.toFixed(4)),
// 		unit: 'ms',
// 	});
// }

// console.log(JSON.stringify(results, null, 2));
