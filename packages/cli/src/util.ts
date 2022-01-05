/* eslint-disable @typescript-eslint/no-var-requires */
const { spawnSync: _spawnSync } = require('child_process');

import { sync as _commandExistsSync } from 'command-exists';
import { Document, FileUtils, Logger, NodeIO, PropertyType, Texture, Transform } from '@gltf-transform/core';

// Mock for tests.

export let spawnSync = _spawnSync;
export let commandExistsSync = _commandExistsSync;

export function mockSpawnSync(_spawnSync: unknown): void {
	spawnSync = _spawnSync;
}

export function mockCommandExistsSync(_commandExistsSync: (n: string) => boolean): void {
	commandExistsSync = _commandExistsSync;
}

// Formatting.

export function formatLong(x: number): string {
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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

// Textures.

/** Returns names of all texture slots using the given texture. */
export function getTextureSlots(doc: Document, texture: Texture): string[] {
	const root = doc.getRoot();
	const slots = doc
		.getGraph()
		.listParentEdges(texture)
		.filter((edge) => edge.getParent() !== root)
		.map((edge) => edge.getName());
	return Array.from(new Set(slots));
}

/** Returns bit mask of all texture channels used by the given texture. */
export function getTextureChannels(doc: Document, texture: Texture): number {
	let mask = 0x0000;
	for (const edge of doc.getGraph().listParentEdges(texture)) {
		const { channels } = edge.getAttributes() as { channels: number | undefined };

		if (channels) {
			mask |= channels;
			continue;
		}

		if (edge.getParent().propertyType !== PropertyType.ROOT) {
			doc.getLogger().warn(`Missing attribute ".channels" on edge, "${edge.getName()}".`);
		}
	}
	return mask;
}

/** Helper class for managing a CLI command session. */
export class Session {
	constructor(private _io: NodeIO, private _logger: Logger, private _input: string, private _output: string) {
		_io.setLogger(_logger);
	}

	public static create(io: NodeIO, logger: unknown, input: unknown, output: unknown): Session {
		return new Session(io, logger as Logger, input as string, output as string);
	}

	public async transform(...transforms: Transform[]): Promise<void> {
		const doc = this._input
			? (await this._io.read(this._input)).setLogger(this._logger)
			: new Document().setLogger(this._logger);

		// Warn and remove lossy compression, to avoid increasing loss on round trip.
		for (const extensionName of ['KHR_draco_mesh_compression', 'EXT_meshopt_compression']) {
			const extension = doc
				.getRoot()
				.listExtensionsUsed()
				.find((extension) => extension.extensionName === extensionName);
			if (extension) {
				extension.dispose();
				this._logger.warn(`Decoded ${extensionName}. Further compression will be lossy.`);
			}
		}

		await doc.transform(...transforms);

		await this._io.write(this._output, doc);

		const { lastReadBytes, lastWriteBytes } = this._io;
		if (!this._input) {
			const output = FileUtils.basename(this._output) + '.' + FileUtils.extension(this._output);
			this._logger.info(`${output} (${formatBytes(lastWriteBytes)})`);
		} else {
			const input = FileUtils.basename(this._input) + '.' + FileUtils.extension(this._input);
			const output = FileUtils.basename(this._output) + '.' + FileUtils.extension(this._output);
			this._logger.info(
				`${input} (${formatBytes(lastReadBytes)})` + ` → ${output} (${formatBytes(lastWriteBytes)})`
			);
		}
	}
}
