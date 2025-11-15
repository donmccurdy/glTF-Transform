import type { ChildProcess } from 'node:child_process';
import { spawn as _spawn, execSync } from 'node:child_process';
import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import CLITable from 'cli-table3';
import { stringify } from 'csv-stringify';
import micromatch from 'micromatch';
import stripAnsi from 'strip-ansi';

// Constants.

export const XMPContext: Record<string, string> = {
	dc: 'http://purl.org/dc/elements/1.1/',
	model3d: 'https://schema.khronos.org/model3d/xsd/1.0/',
	rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
	xmp: 'http://ns.adobe.com/xap/1.0/',
	xmpRights: 'http://ns.adobe.com/xap/1.0/rights/',
};

// Using 'micromatch' because 'contains: true' did not work as expected with
// minimatch. Need to ensure that '*' matches patterns like 'image/png'.
export const MICROMATCH_OPTIONS = { nocase: true, contains: true };

// See: https://github.com/micromatch/micromatch/issues/224
export function regexFromArray(values: string[]): RegExp {
	const pattern = values.map((s) => `(${s})`).join('|');
	return micromatch.makeRe(pattern, MICROMATCH_OPTIONS);
}

// Mocks for tests.

export let spawn: typeof _spawn = _spawn;
export const commandExists: typeof _commandExists = _commandExists;
export let waitExit: typeof _waitExit = _waitExit;

export let log: typeof console.log = console.log;

export function mockSpawn(_spawn: unknown): void {
	spawn = _spawn as typeof spawn;
}

export function mockCommandExists(commandExists: (n: string) => Promise<boolean>): void {
	commandExists = commandExists as unknown as typeof _commandExists;
}

export function mockWaitExit(_waitExit: (process: ChildProcess) => Promise<[unknown, string, string]>): void {
	waitExit = _waitExit;
}

/** A conservative alternative to `shell-quote`, for simple inputs only. */
function _assertValidCommand(cmd: string) {
	if (!/^[a-zA-Z0-9_-]+$/.test(cmd)) {
		throw new Error(`Unexpected command, "${cmd}"`);
	}
}

/**
 * Resolves 'true' if an executable command-line command with the given name
 * exists, otherwise returns false. This is a stripped-down version of the
 * npm package, `command-exists` (https://github.com/mathisonian/command-exists).
 */
async function _commandExists(cmd: string): Promise<boolean> {
	_assertValidCommand(cmd);

	if (process.platform === 'win32') {
		try {
			return !!execSync('where ' + cmd);
		} catch {
			return false;
		}
	}

	const isFile = await access(cmd, constants.F_OK)
		.then(() => true)
		.catch(() => false);

	if (!isFile) {
		const versionCmd = `command -v ${cmd} 2>/dev/null && { echo >&1 ${cmd}; exit 0; }`;
		return !!execSync(versionCmd, { encoding: 'utf8' });
	}

	const isExecutable = access(cmd, constants.F_OK | constants.X_OK)
		.then(() => true)
		.catch(() => false);

	return isExecutable;
}

export async function _waitExit(process: ChildProcess): Promise<[unknown, string, string]> {
	let stdout = '';
	if (process.stdout) {
		for await (const chunk of process.stdout) {
			stdout += chunk;
		}
	}
	let stderr = '';
	if (process.stderr) {
		for await (const chunk of process.stderr) {
			stderr += chunk;
		}
	}
	const status = await new Promise((resolve, _) => {
		process.on('close', resolve);
	});
	return [status, stdout, stderr];
}

export function mockConsoleLog(_log: (...data: unknown[]) => void): void {
	log = _log;
}

// Formatting.

const _longFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
export function formatLong(x: number): string {
	return _longFormatter.format(x);
}

export function formatBytes(bytes: number, decimals = 2): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1000;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatParagraph(str: string): string {
	return str
		.match(/.{1,80}(\s|$)/g)!
		.map((line) => line.trim())
		.join('\n');
}

export function formatHeader(title: string): string {
	return '' + '\n ' + title.toUpperCase() + '\n ────────────────────────────────────────────';
}

export enum TableFormat {
	PRETTY = 'pretty',
	CSV = 'csv',
	MD = 'md',
}

const CLI_TABLE_MARKDOWN_CHARS = {
	top: '',
	'top-mid': '',
	'top-left': '',
	'top-right': '',
	bottom: '',
	'bottom-mid': '',
	'bottom-left': '',
	'bottom-right': '',
	left: '|',
	'left-mid': '',
	mid: '',
	'mid-mid': '',
	right: '|',
	'right-mid': '',
	middle: '|',
};

export async function formatTable(format: TableFormat, head: string[], rows: string[][]): Promise<string> {
	switch (format) {
		case TableFormat.PRETTY: {
			const table = new CLITable({ head });
			table.push(...rows);
			return table.toString();
		}
		case TableFormat.CSV:
			return new Promise((resolve, reject) => {
				stringify([head, ...rows], (err, output) => {
					err ? reject(err) : resolve(output);
				});
			});
		case TableFormat.MD: {
			const table = new CLITable({ head, chars: CLI_TABLE_MARKDOWN_CHARS });
			table.push(new Array(rows[0].length).fill('---'));
			table.push(...rows);
			return stripAnsi(table.toString());
		}
	}
}

export function formatXMP(value: string | number | boolean | Record<string, unknown> | null): string {
	if (!value) {
		return '';
	}

	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return value.toString();
	}

	if (value['@list']) {
		const list = value['@list'] as string[];
		const hasCommas = list.some((value) => value.indexOf(',') > 0);
		return list.join(hasCommas ? '; ' : ', ');
	}

	if (value['@type'] === 'rdf:Alt') {
		return (value['rdf:_1'] as Record<string, string>)['@value'];
	}

	return JSON.stringify(value);
}

export function underline(str: string): string {
	return `\x1b[4m${str}\x1b[0m`;
}

export function dim(str: string): string {
	return `\x1b[2m${str}\x1b[0m`;
}
