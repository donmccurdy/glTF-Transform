/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const minimatch = require('minimatch');
const semver = require('semver');
const tmp = require('tmp');

import { BufferUtils, Document, FileUtils, ImageUtils, Logger, TextureChannel, Transform, vec2 } from '@gltf-transform/core';
import { TextureBasisu } from '@gltf-transform/extensions';
import { commandExistsSync, formatBytes, getTextureChannels, getTextureSlots, spawnSync } from '../util';

tmp.setGracefulCleanup();

const KTX_SOFTWARE_VERSION_MIN = '4.0.0-1';

const { R, G } = TextureChannel;

/**********************************************************************************************
 * Interfaces.
 */

export const Mode = {
	ETC1S: 'etc1s',
	UASTC: 'uastc',
};

export const Filter = {
	BOX: 'box',
	TENT: 'tent',
	BELL: 'bell',
	BSPLINE: 'b-spline',
	MITCHELL: 'mitchell',
	LANCZOS3: 'lanczos3',
	LANCZOS4: 'lanczos4',
	LANCZOS6: 'lanczos6',
	LANCZOS12: 'lanczos12',
	BLACKMAN: 'blackman',
	KAISER: 'kaiser',
	GAUSSIAN: 'gaussian',
	CATMULLROM: 'catmullrom',
	QUADRATIC_INTERP: 'quadratic_interp',
	QUADRATIC_APPROX: 'quadratic_approx',
	QUADRATIC_MIX: 'quadratic_mix',
};

interface GlobalOptions {
	mode: string;
	slots?: string;
	filter?: string;
	filterScale?: number;
	powerOfTwo?: boolean;
}

export interface ETC1SOptions extends GlobalOptions {
	quality?: number;
	compression?: number;
	maxEndpoints?: number;
	maxSelectors?: number;
	rdoOff?: boolean;
	rdoThreshold?: number;
}

export interface UASTCOptions extends GlobalOptions {
	level?: number;
	rdo?: number;
	rdoDictionarySize?: number;
	rdoBlockScale?: number;
	rdoStdDev?: number;
	rdoMultithreading?: boolean;
	zstd?: number;
}

const GLOBAL_DEFAULTS = {
	filter: Filter.LANCZOS4,
	filterScale: 1,
	powerOfTwo: false,
	slots: '*',
};

export const ETC1S_DEFAULTS = {
	quality: 128,
	compression: 1,
	...GLOBAL_DEFAULTS,
};

export const UASTC_DEFAULTS = {
	level: 2,
	rdo: 0,
	rdoDictionarySize: 32768,
	rdoBlockScale: 10.0,
	rdoStdDev: 18.0,
	rdoMultithreading: true,
	zstd: 18,
	...GLOBAL_DEFAULTS,
};

/**********************************************************************************************
 * Implementation.
 */

export const toktx = function (options: ETC1SOptions | UASTCOptions): Transform {
	options = {...(options.mode === Mode.ETC1S ? ETC1S_DEFAULTS : UASTC_DEFAULTS), ...options};

	return (doc: Document): void =>  {
		const logger = doc.getLogger();

		// Confirm recent version of KTX-Software is installed.
		checkKTXSoftware(logger);

		const basisuExtension = doc.createExtension(TextureBasisu).setRequired(true);

		let numCompressed = 0;

		doc.getRoot()
			.listTextures()
			.forEach((texture, textureIndex) => {
				const slots = getTextureSlots(doc, texture);
				const channels = getTextureChannels(doc, texture);
				const textureLabel = texture.getURI()
					|| texture.getName()
					|| `${textureIndex + 1}/${doc.getRoot().listTextures().length}`;
				logger.debug(`Texture ${textureLabel} (${slots.join(', ')})`);

				// FILTER: Exclude textures that don't match the 'slots' glob, or are already KTX.

				if (texture.getMimeType() === 'image/ktx2') {
					logger.debug('• Skipping, already KTX.');
					return;
				} else if (options.slots !== '*'
						&& !slots.find((slot) => minimatch(slot, options.slots, {nocase: true}))) {
					logger.debug(`• Skipping, excluded by pattern "${options.slots}".`);
					return;
				}

				const image = texture.getImage();
				const size = texture.getSize();
				if (!image || !size) {
					logger.warn('• Skipping, unreadable texture.');
					return;
				}

				// PREPARE: Create temporary in/out paths for the 'toktx' CLI tool, and determine
				// necessary commandline flags.

				const extension = texture.getURI()
					? FileUtils.extension(texture.getURI())
					: ImageUtils.mimeTypeToExtension(texture.getMimeType());
				const inPath = tmp.tmpNameSync({postfix: '.' + extension});
				const outPath = tmp.tmpNameSync({postfix: '.ktx2'});

				const inBytes = image.byteLength;
				fs.writeFileSync(inPath, Buffer.from(image));

				const params = [
					...createParams(slots, channels, size, logger, options),
					outPath,
					inPath
				];
				logger.debug(`• toktx ${params.join(' ')}`);

				// COMPRESS: Run `toktx` CLI tool.

				const {status, stderr} = spawnSync('toktx', params, {stdio: [process.stderr]});

				if (status !== 0) {
					logger.error(`• Texture compression failed:\n\n${stderr.toString()}`);
					throw new Error('Texture compression failed');
				}

				// PACK: Replace image data in the glTF asset.

				texture
					.setImage(BufferUtils.trim(fs.readFileSync(outPath)))
					.setMimeType('image/ktx2');

				if (texture.getURI()) {
					texture.setURI(FileUtils.basename(texture.getURI()) + '.ktx2');
				}

				numCompressed++;

				const outBytes = image.byteLength;
				logger.debug(`• ${formatBytes(inBytes)} → ${formatBytes(outBytes)} bytes.`);
			});

		if (numCompressed === 0) {
			logger.warn('No textures were found, or none were selected for compression.');
		}

		if (!doc.getRoot().listTextures().find((t) => t.getMimeType() === 'image/ktx2')) {
			basisuExtension.dispose();
		}
	};
};

/**********************************************************************************************
 * Utilities.
 */

/** Create CLI parameters from the given options. Attempts to write only non-default options. */
function createParams (
		slots: string[],
		channels: number,
		size: vec2,
		logger: Logger,
		options: ETC1SOptions | UASTCOptions): (string|number)[] {
	const params: (string|number)[] = [];
	params.push('--genmipmap');
	if (options.filter !== GLOBAL_DEFAULTS.filter) params.push('--filter', options.filter!);
	if (options.filterScale !== GLOBAL_DEFAULTS.filterScale) {
		params.push('--fscale', options.filterScale!);
	}

	if (options.mode === Mode.UASTC) {
		const _options = options as UASTCOptions;
		params.push('--uastc', _options.level!);
		if (_options.rdo !== UASTC_DEFAULTS.rdo) {
			params.push('--uastc_rdo_l', _options.rdo!);
		}
		if (_options.rdoDictionarySize !== UASTC_DEFAULTS.rdoDictionarySize) {
			params.push('--uastc_rdo_d', _options.rdoDictionarySize!);
		}
		if (_options.rdoBlockScale !== UASTC_DEFAULTS.rdoBlockScale) {
			params.push('--uastc_rdo_b', _options.rdoBlockScale!);
		}
		if (_options.rdoStdDev !== UASTC_DEFAULTS.rdoStdDev) {
			params.push('--uastc_rdo_s', _options.rdoStdDev!);
		}
		if (!_options.rdoMultithreading) {
			params.push('--uastc_rdo_m');
		}
		if (_options.zstd && _options.zstd > 0) params.push('--zcmp', _options.zstd);
	} else {
		const _options = options as ETC1SOptions;
		params.push('--bcmp');
		if (_options.quality !== ETC1S_DEFAULTS.quality) {
			params.push('--qlevel', _options.quality!);
		}
		if (_options.compression !== ETC1S_DEFAULTS.compression) {
			params.push('--clevel', _options.compression!);
		}
		if (_options.maxEndpoints) params.push('--max_endpoints', _options.maxEndpoints);
		if (_options.maxSelectors) params.push('--max_selectors', _options.maxSelectors);

		if (_options.rdoOff) {
			params.push('--no_endpoint_rdo', '--no_selector_rdo');
		} else if (_options.rdoThreshold) {
			params.push('--endpoint_rdo_threshold', _options.rdoThreshold);
			params.push('--selector_rdo_threshold', _options.rdoThreshold);
		}

		if (slots.find((slot) => minimatch(slot, '*normal*', {nocase: true}))) {
			params.push('--normal_map');
		}
	}

	if (slots.length
			&& !slots.find((slot) => minimatch(slot, '*{color,emissive}*', {nocase: true}))) {
		// See: https://github.com/donmccurdy/glTF-Transform/issues/215
		params.push('--assign_oetf', 'linear', '--assign_primaries', 'none');
	}

	if (channels === R) {
		params.push('--target_type', 'R');
	} else if (channels === G || channels === (R | G)) {
		params.push('--target_type', 'RG');
	}

	let width: number;
	let height: number;
	if (options.powerOfTwo) {
		width = preferredPowerOfTwo(size[0], 2048);
		height = preferredPowerOfTwo(size[1], 2048);
	} else {
		if (!isPowerOfTwo(size[0]) || !isPowerOfTwo(size[1])) {
			logger.warn(
				`Texture dimensions ${size[0]}x${size[1]} are NPOT, and may`
				+ ' fail in older APIs (including WebGL 1.0) on certain devices.'
			);
		}
		width = isMultipleOfFour(size[0]) ? size[0] : ceilMultipleOfFour(size[0]);
		height = isMultipleOfFour(size[1]) ? size[1] : ceilMultipleOfFour(size[1]);
	}

	if (width !== size[0] || height !== size[1]) {
		params.push('--resize', `${width}x${height}`);
	}

	return params;
}

function checkKTXSoftware(logger: Logger): void {
	if (!commandExistsSync('toktx') && !process.env.CI) {
		throw new Error('Command "toktx" not found. Please install KTX-Software, from:\n\nhttps://github.com/KhronosGroup/KTX-Software');
	}

	const {status, stdout, stderr} = spawnSync('toktx', ['--version'], {encoding: 'utf-8'});

	const version = ((stdout || stderr) as string)
		.replace(/toktx\s+/, '').replace(/~\d+/, '').trim();

	if (status !== 0 || !semver.valid(semver.clean(version))) {
		throw new Error('Unable to find "toktx" version. Confirm KTX-Software is installed.');
	} else if (semver.lt(semver.clean(version), KTX_SOFTWARE_VERSION_MIN)) {
		throw new Error(`Requires KTX-Software >= v${KTX_SOFTWARE_VERSION_MIN}, found ${version}.`);
	} else {
		logger.debug(`Found KTX-Software ${version}.`);
	}
}

function isPowerOfTwo (value: number): boolean {
	if (value <= 2) return true;
	return (value & (value - 1)) === 0 && value !== 0;
}

function preferredPowerOfTwo (value: number, max: number): number {
	if (value <= 2) return value;
	if (value <= 4) return 4;

	const lo = floorPowerOfTwo(value);
	const hi = ceilPowerOfTwo(value);

	if (hi > max) return lo;
	if (hi - value > value - lo) return lo;
	return hi;
}

function floorPowerOfTwo (value: number): number {
	return Math.pow(2, Math.floor(Math.log(value) / Math.LN2));
}

function ceilPowerOfTwo (value: number): number {
	return Math.pow(2, Math.ceil(Math.log(value) / Math.LN2));
}

function isMultipleOfFour (value: number): boolean {
	return value % 4 === 0;
}

function ceilMultipleOfFour (value: number): number {
	if (value <= 2) return value;
	if (value <= 4) return 4;
	return value % 4 ? value + 4 - value % 4 : value;
}
