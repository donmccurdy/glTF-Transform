import { Document, NodeIO, Logger, FileUtils, Transform, Format, ILogger } from '@gltf-transform/core';
import type { Packet, XMP } from '@gltf-transform/extensions';
import { unpartition } from '@gltf-transform/functions';
import { formatBytes, XMPContext } from './util';

/** Helper class for managing a CLI command session. */
export class Session {
	private _outputFormat: Format;

	constructor(private _io: NodeIO, private _logger: ILogger, private _input: string, private _output: string) {
		_io.setLogger(_logger);
		this._outputFormat = FileUtils.extension(_output) === 'glb' ? Format.GLB : Format.GLTF;
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

		await doc.transform(...transforms, updateMetadata);

		if (this._outputFormat === Format.GLB) {
			await doc.transform(unpartition());
		}

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

function updateMetadata(document: Document): void {
	const root = document.getRoot();
	const xmpExtension = root.listExtensionsUsed().find((ext) => ext.extensionName === 'KHR_xmp_json_ld') as XMP | null;

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
