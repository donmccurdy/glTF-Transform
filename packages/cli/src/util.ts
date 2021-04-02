/* eslint-disable @typescript-eslint/no-var-requires */
const { spawnSync: _spawnSync } = require('child_process');

import { sync as _commandExistsSync } from 'command-exists';
import { Document, FileUtils, Logger, NodeIO, Transform } from '@gltf-transform/core';

// Mock for tests.

export let spawnSync = _spawnSync;
export let commandExistsSync = _commandExistsSync;

export function mockSpawnSync (_spawnSync: unknown): void {
	spawnSync = _spawnSync;
}

export function mockCommandExistsSync (_commandExistsSync: (n: string) => boolean): void {
	commandExistsSync = _commandExistsSync;
}

// Utilities.

export function formatLong(x: number): string {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatParagraph(str: string): string {
	return str.match(/.{1,80}(\s|$)/g)
		.map((line) => line.trim())
		.join('\n');
}

export function formatHeader(title: string): string {
	return ''
		+ '\n ' + title.toUpperCase()
		+ '\n ────────────────────────────────────────────';
}

/** Helper class for managing a CLI command session. */
export class Session {
	constructor (
			private _io: NodeIO,
			private _logger: Logger,
			private _input: string,
			private _output: string) {
		_io.setLogger(_logger);
	}

	public static create (io: NodeIO, logger: unknown, input: unknown, output: unknown): Session {
		return new Session(io, logger as Logger, input as string, output as string);
	}

	public async transform (...transforms: Transform[]): Promise<void> {
		const doc = this._input
			? this._io.read(this._input).setLogger(this._logger)
			: new Document().setLogger(this._logger);

		const dracoExtension = doc.getRoot().listExtensionsUsed()
			.find((extension) => extension.extensionName === 'KHR_draco_mesh_compression');
		if (dracoExtension) {
			dracoExtension.dispose();
			this._logger.warn('Decoding Draco compression. Further compression will be lossy.');
		}

		await doc.transform(...transforms);

		this._io.write(this._output, doc);

		const {lastReadBytes, lastWriteBytes} = this._io;
		if (!this._input) {
			const output = FileUtils.basename(this._output)
				+ '.' + FileUtils.extension(this._output);
			this._logger.info(`${output} (${formatBytes(lastWriteBytes)})`);
		} else {
			const input = FileUtils.basename(this._input)
				+ '.' + FileUtils.extension(this._input);
			const output = FileUtils.basename(this._output)
				+ '.' + FileUtils.extension(this._output);
			this._logger.info(
				`${input} (${formatBytes(lastReadBytes)})`
				+ ` → ${output} (${formatBytes(lastWriteBytes)})`
			);
		}
	}
}
