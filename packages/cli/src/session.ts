import { Document, NodeIO, FileUtils, Transform, Format, Verbosity } from '@gltf-transform/core';
import type { Packet, KHRXMP } from '@gltf-transform/extensions';
import { unpartition } from '@gltf-transform/functions';
import { Listr, ListrTask } from 'listr2';
import { dim, formatBytes, formatLong, XMPContext } from './util.js';
import { performance } from 'perf_hooks'; // global in Node.js v16+
import { Logger } from './program.js';

/** Helper class for managing a CLI command session. */
export class Session {
	private _outputFormat: Format;
	private _display = false;

	constructor(
		private _io: NodeIO,
		private _logger: Logger,
		private _input: string,
		private _output: string,
	) {
		_io.setLogger(_logger);
		this._outputFormat = FileUtils.extension(_output) === 'glb' ? Format.GLB : Format.GLTF;
	}

	public static create(io: NodeIO, logger: Logger, input: unknown, output: unknown): Session {
		return new Session(io, logger, input as string, output as string);
	}

	public setDisplay(display: boolean): this {
		this._display = display;
		return this;
	}

	public async transform(...transforms: Transform[]): Promise<void> {
		const logger = this._logger;
		const document = this._input
			? (await this._io.read(this._input)).setLogger(this._logger)
			: new Document().setLogger(this._logger);

		// Warn and remove lossy compression, to avoid increasing loss on round trip.
		for (const extensionName of ['KHR_draco_mesh_compression', 'EXT_meshopt_compression']) {
			const extension = document
				.getRoot()
				.listExtensionsUsed()
				.find((extension) => extension.extensionName === extensionName);
			if (extension) {
				extension.dispose();
				this._logger.warn(`Decoded ${extensionName}. Further compression will be lossy.`);
			}
		}

		if (this._display) {
			const tasks = [] as ListrTask[];
			for (const transform of transforms) {
				tasks.push({
					title: transform.name,
					task: async (ctx, task) => {
						let time = performance.now();
						await document.transform(transform);
						time = Math.round(performance.now() - time);
						task.title = task.title.padEnd(20) + dim(` ${formatLong(time)}ms`);
					},
				});
			}

			const prevLevel = logger.getVerbosity();
			if (prevLevel === Verbosity.INFO) logger.setVerbosity(Verbosity.WARN);

			// Disable signal listeners so Ctrl+C works. Note that 'simple' and 'default'
			// renderers have different capability to display errors and warnings.
			await new Listr(tasks, { renderer: 'default', registerSignalListeners: false }).run();
			console.log('');

			logger.setVerbosity(prevLevel);
		} else {
			await document.transform(...transforms);
		}

		await document.transform(updateMetadata);

		if (this._outputFormat === Format.GLB) {
			await document.transform(unpartition());
		}

		await this._io.write(this._output, document);

		const { lastReadBytes, lastWriteBytes } = this._io;
		if (!this._input) {
			const output = FileUtils.basename(this._output) + '.' + FileUtils.extension(this._output);
			this._logger.info(`${output} (${formatBytes(lastWriteBytes)})`);
		} else {
			const input = FileUtils.basename(this._input) + '.' + FileUtils.extension(this._input);
			const output = FileUtils.basename(this._output) + '.' + FileUtils.extension(this._output);
			this._logger.info(
				`${input} (${formatBytes(lastReadBytes)})` + ` → ${output} (${formatBytes(lastWriteBytes)})`,
			);
		}
	}
}

function updateMetadata(document: Document): void {
	const root = document.getRoot();
	const xmpExtension = root
		.listExtensionsUsed()
		.find((ext) => ext.extensionName === 'KHR_xmp_json_ld') as KHRXMP | null;

	// Do not add KHR_xmp_json_ld to assets that don't already use it.
	if (!xmpExtension) return;

	const rootPacket = root.getExtension<Packet>('KHR_xmp_json_ld') || xmpExtension.createPacket();

	// xmp:MetadataDate should be the same as, or more recent than, xmp:ModifyDate.
	// https://github.com/adobe/xmp-docs/blob/master/XMPNamespaces/xmp.md
	const date = new Date().toISOString().substring(0, 10);
	rootPacket
		.setContext({ ...rootPacket.getContext(), xmp: XMPContext.xmp })
		.setProperty('xmp:ModifyDate', date)
		.setProperty('xmp:MetadataDate', date);
}
