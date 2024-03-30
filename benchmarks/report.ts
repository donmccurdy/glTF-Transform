import { VERSION } from '@gltf-transform/core';
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

const RESULTS_PATH = resolve(__dirname, 'results', `${getCPUIdentifier()}.csv`);

type BenchResult = Record<string, unknown> & { version: string };

export async function reportBench(bench: Bench): Promise<void> {
	let results: BenchResult[] = [];
	if (existsSync(RESULTS_PATH)) {
		results = csvParse(await readFile(RESULTS_PATH, 'utf-8')) as unknown as BenchResult[];
	}

	const benchEntries = bench.tasks.map(({ name, result }) => [name, formatTime(result!.mean)]);
	results.push({ version: VERSION, ...Object.fromEntries(benchEntries) });
	results.sort((a, b) => (semver.gt(a.version, b.version) ? 1 : -1));

	await writeFile(RESULTS_PATH, csvFormat(results));
}

export async function printBench(): Promise<void> {
	const results = csvParse(await readFile(RESULTS_PATH, 'utf-8')) as unknown as BenchResult[];
	const tasks = Object.keys(results[0]).filter((name) => name !== 'version');
	const versions = results.map(({version}) => version);
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
				version.padEnd(20, ' ') + bar('▀'.repeat(width).padEnd(45, ' ')) + dim(formatTime(time) + 'ms')
			);
		}
		console.log('');
	}
}
