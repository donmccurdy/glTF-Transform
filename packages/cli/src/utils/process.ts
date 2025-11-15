import type { ChildProcess } from 'node:child_process';
import { spawn as _spawn, execSync } from 'node:child_process';
import { access, constants } from 'node:fs/promises';

// Mocks for tests.

export let spawn: typeof _spawn = _spawn;
export let commandExists: typeof _commandExists = _commandExists;
export let waitExit: typeof _waitExit = _waitExit;

export function mockSpawn(_spawn: unknown): void {
	spawn = _spawn as typeof spawn;
}

export function mockCommandExists(fn: (n: TrustedCommand) => Promise<boolean>): void {
	commandExists = fn as unknown as typeof _commandExists;
}

export function mockWaitExit(_waitExit: (process: ChildProcess) => Promise<[unknown, string, string]>): void {
	waitExit = _waitExit;
}

export enum TrustedCommand {
	KTX = 'ktx',
}

/**
 * Resolves 'true' if an executable command-line command with the given name
 * exists, otherwise returns false. This is a stripped-down version of the
 * npm package, `command-exists` (https://github.com/mathisonian/command-exists).
 */
async function _commandExists(cmd: TrustedCommand): Promise<boolean> {
	if (process.platform === 'win32') {
		try {
			return !!execSync(`where ${cmd}`);
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
