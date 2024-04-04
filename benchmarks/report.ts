import type { Bench } from 'tinybench';
import os from 'node:os';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvParse, csvFormat } from 'd3-dsv';
import semver from 'semver';
import { bright, dim, max } from './utils';

const __dirname = dirname(fileURLToPath(import.meta.url));
const formatTime = (ms: number) => Number(ms.toFixed(4));
const getCPUIdentifier = () => os.cpus()[0].model.toLowerCase().replace(/\W+/g, '-');
const semverSort = (a: { version: string }, b: { version: string }): number => {
	if (!semver.valid(a.version)) return 1;
	if (!semver.valid(b.version)) return -1;
	return semver.gt(a.version, b.version) ? 1 : -1;
};

const RESULTS_PATH = resolve(__dirname, 'results', `${getCPUIdentifier()}.csv`);

type BenchResult = Record<string, unknown> & { version: string };

/** Reads historical benchmark results from CSV. */
export async function readReport(): Promise<BenchResult[]> {
	if (existsSync(RESULTS_PATH)) {
		return csvParse(await readFile(RESULTS_PATH, 'utf-8')) as unknown as BenchResult[];
	}
	return [];
}

/** Writes historical benchmark results from CSV. */
export async function writeReport(results: BenchResult[]): Promise<void> {
	await writeFile(RESULTS_PATH, csvFormat(results));
}

/** Appends results of a bench run to the historical results. */
export async function updateReport(results: BenchResult[], bench: Bench, version: string): Promise<BenchResult[]> {
	const benchEntries = bench.tasks.map(({ name, result }) => [name, formatTime(result!.mean)]);
	results.push({ version, ...Object.fromEntries(benchEntries) });
	results.sort(semverSort);
	return results;
}

/** Displays historical benchmark results in stdout. */
export async function printReport(results: BenchResult[]): Promise<void> {
	const tasks = Object.keys(results[0]).filter((name) => name !== 'version');
	const versions = results.map(({ version }) => version);
	for (const task of tasks) {
		const taskTimes = results.map((result) => Number(result[task]));
		const taskTimeMax = max(taskTimes);
		const scale = 40 / taskTimeMax;

		console.log(bright(task));
		for (let i = 0; i < versions.length; i++) {
			const version = versions[i];
			const time = taskTimes[i];
			const width = Math.round(time * scale);
			const bar = i === versions.length - 1 ? (str: string) => str : dim;
			console.log(
				version.padEnd(20, ' ') + bar('▀'.repeat(width).padEnd(45, ' ')) + dim(formatTime(time) + 'ms'),
			);
		}
		console.log('');
	}
}
