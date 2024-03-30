import { Bench } from 'tinybench';
import { tasks } from './tasks/index.js';
import { printBench, reportBench } from './report.js';

/**
 * DEVELOPER NOTES:
 *
 * Started out with benchmark.js, but quickly hit some frustrating issues.
 * Async is difficult. Setup functions are serialized and can't access scope.
 * Options on the Suite appear to do nothing. Switched to tinybench.
 */

const filterIndex = process.argv.indexOf('--filter');
const filter = filterIndex === -1 ? null : process.argv[filterIndex + 1];

/******************************************************************************
 * CREATE BENCHMARK SUITE
 */

const bench = new Bench({ time: 1000 });
for (const [title, fn, options] of tasks) {
	if (!filter || title.startsWith(filter)) {
		bench.add(title, fn, options);
	}
}

/******************************************************************************
 * RUN BENCHMARK
 */

await bench.run();

/******************************************************************************
 * REPORT
 */

if (process.argv.includes('--table')) console.table(bench.table());
if (process.argv.includes('--report')) await reportBench(bench);
if (process.argv.includes('--print')) await printBench();
