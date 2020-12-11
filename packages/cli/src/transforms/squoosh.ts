/* eslint-disable @typescript-eslint/no-var-requires */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const minimatch = require('minimatch');
const tmp = require('tmp');

import { sync as commandExistsSync } from 'command-exists';
import { BufferUtils, Document, FileUtils, ImageUtils, Logger, Transform } from '@gltf-transform/core';
import { TextureWebP } from '@gltf-transform/extensions';
import { formatBytes, getTextureSlots } from '../util';

tmp.setGracefulCleanup();

const SQUOOSH_VERSION = '^0.6.0'

// Configuration: https://github.com/GoogleChromeLabs/squoosh/blob/visdf/cli/src/codecs.js

export interface SquooshOptions {
	config: string;
	autoRounds?: number;
	autoTarget?: number;
	formats?: string;
	slots?: string;
}

const DEFAULT_OPTIONS: SquooshOptions = {
	config: 'auto',
	autoRounds: 6,
	autoTarget: 1.4,
	slots: '*'
};
const WEBP_DEFAULT_OPTIONS: SquooshOptions = {...DEFAULT_OPTIONS};
const MOZJPEG_DEFAULT_OPTIONS: SquooshOptions = {formats: 'jpeg', ...DEFAULT_OPTIONS};
const OXIPNG_DEFAULT_OPTIONS: SquooshOptions = {formats: 'png', ...DEFAULT_OPTIONS};

interface SquooshInternalOptions {
	formats?: string;
	slots?: string;
	flags: string[];
	outExtension: string;
	outMimeType: string;
}

function createDefaultFlags(options: SquooshOptions, logger: Logger): string[] {
	// Verify that user hasn't provided both auto and manual configuration.
	// See: https://github.com/GoogleChromeLabs/squoosh/issues/898.
	const usesAutoSettings = options.autoTarget !== DEFAULT_OPTIONS.autoTarget
		|| options.autoRounds !== DEFAULT_OPTIONS.autoRounds;
	if (options.config !== 'auto' && usesAutoSettings) {
		logger.warn('Ignoring --auto-target and/or --auto-rounds, because --config has been provided.')
	}

	// Verify that config is valid JSON.
	if (options.config !== 'auto') {
		try {
			JSON.parse(options.config)
		} catch (e) {
			logger.warn(`Invalid JSON configuration: ${options.config}`);
			throw e;
		}
	}

	return options.config !== 'auto'
		? [options.config]
		: [
			'auto',
			'--optimizer-butteraugli-target', options.autoTarget + '',
			'--max-optimizer-rounds', options.autoRounds + '',
		];
}

export const webp = function (options: SquooshOptions = WEBP_DEFAULT_OPTIONS): Transform {
	options = {...WEBP_DEFAULT_OPTIONS, ...options};
	return (doc: Document): void => {
		doc.createExtension(TextureWebP).setRequired(true);
		return squoosh({
			formats: options.formats,
			slots: options.slots,
			flags: ['--webp', ...createDefaultFlags(options, doc.getLogger())],
			outExtension: 'webp',
			outMimeType: 'image/webp',
		})(doc);
	};
}

export const mozjpeg = function (options: SquooshOptions = MOZJPEG_DEFAULT_OPTIONS): Transform {
	options = {...MOZJPEG_DEFAULT_OPTIONS, ...options};
	return (doc: Document): void => {
		return squoosh({
			formats: options.formats,
			slots: options.slots,
			flags: ['--mozjpeg', ...createDefaultFlags(options, doc.getLogger())],
			outExtension: 'jpg',
			outMimeType: 'image/jpeg',
		})(doc);
	};
}

export const oxipng = function (options: SquooshOptions = OXIPNG_DEFAULT_OPTIONS): Transform {
	options = {...OXIPNG_DEFAULT_OPTIONS, ...options};
	return (doc: Document): void => {
		return squoosh({
			formats: options.formats,
			slots: options.slots,
			flags: ['--oxipng', ...createDefaultFlags(options, doc.getLogger())],
			outExtension: 'png',
			outMimeType: 'image/png',
		})(doc);
	};
}

/** Uses Squoosh CLI to compress textures with the specified encoder. */
const squoosh = function (options: SquooshInternalOptions): Transform {
	return (doc: Document): void => {
		const logger = doc.getLogger();

		if (!commandExistsSync('squoosh-cli') && !process.env.CI) {
			throw new Error(
				`Squoosh CLI not found. Try "npm install --global @squoosh/cli@${SQUOOSH_VERSION}".`
			);
		}

		if (doc.getRoot().listTextures().length > 1) {
			logger.info('This may take some time. For more detailed progress, use --verbose.');
		}

		let numCompressed = 0;

		doc.getRoot()
			.listTextures()
			.forEach((texture, textureIndex) => {
				const slots = getTextureSlots(doc, texture);
				const label = texture.getURI()
					|| texture.getName()
					|| `${textureIndex + 1}/${doc.getRoot().listTextures().length}`;

				// Filter textures by 'formats' and 'slots' patterns.
				if (options.formats !== '*'
						&& texture.getMimeType() !== `image/${options.formats}`) {
					logger.debug(`• Skipping ${label}, excluded by formats "${options.formats}".`);
					return;
				} else if (options.slots !== '*'
						&& !slots.find((slot) => minimatch(slot, options.slots, {nocase: true}))) {
					logger.debug(`• Skipping ${label}, excluded by slots "${options.slots}".`);
					return;
				}

				// Create temporary in/out paths for the 'squoosh-cli' tool.
				const inExtension = texture.getURI()
					? FileUtils.extension(texture.getURI())
					: ImageUtils.mimeTypeToExtension(texture.getMimeType());
				const inPath = tmp.tmpNameSync({postfix: '.' + inExtension});
				const outDir = tmp.dirSync().name;
				const outPath = options.outExtension
					? path.join(outDir, path.basename(inPath)
						.replace('.' + inExtension, '.' + options.outExtension))
					: path.join(outDir, path.basename(inPath));

				const inBytes = texture.getImage().byteLength;
				fs.writeFileSync(inPath, Buffer.from(texture.getImage()));

				logger.debug(
					`• squoosh-cli ${options.flags.join(' ')} --output-dir ${outDir} ${inPath}`
				);

				// Run `squoosh-cli` CLI tool.
				const {status, error} = spawnSync(
					'squoosh-cli',
					[...options.flags, '--output-dir', outDir, inPath],
					{
						stdio: ['silly', 'debug'].includes(logger['level'])
							? 'inherit'
							: [process.stderr]
					}
				);

				if (status !== 0) {
					logger.error(`• Texture compression failed [status = ${status}].`);
					throw error || new Error('Texture compression failed');
				}

				texture
					.setImage(BufferUtils.trim(fs.readFileSync(outPath)))
					.setMimeType('image/' + options.outExtension);
				if (texture.getURI()) {
					texture.setURI(
						FileUtils.basename(texture.getURI()) + '.' + options.outExtension
					);
				}

				numCompressed++;

				const outBytes = texture.getImage().byteLength;
				logger.info(
					`• Texture ${label} (${slots.join(', ')})`
					+ ` ${formatBytes(inBytes)} → ${formatBytes(outBytes)}.`
				);
			});

		if (numCompressed === 0) {
			logger.warn('No textures were found, or none were selected for compression.');
		}
	};
}
