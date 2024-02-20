import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import micromatch from 'micromatch';
import os from 'os';
import semver from 'semver';
import tmp from 'tmp';
import pLimit from 'p-limit';

import {
	Document,
	FileUtils,
	ILogger,
	ImageUtils,
	TextureChannel,
	Transform,
	vec2,
	uuid,
	Texture,
} from '@gltf-transform/core';
import { KHRTextureBasisu } from '@gltf-transform/extensions';
import {
	createTransform,
	getTextureChannelMask,
	getTextureColorSpace,
	listTextureSlots,
} from '@gltf-transform/functions';
import { spawn, commandExists, formatBytes, waitExit, MICROMATCH_OPTIONS } from '../util.js';

tmp.setGracefulCleanup();

const NUM_CPUS = os.cpus().length || 1; // microsoft/vscode#112122
const KTX_SOFTWARE_VERSION_MIN = '4.3.0';

const { R, G, A } = TextureChannel;

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
	/** Pattern identifying textures to compress, matched to name or URI. */
	pattern?: RegExp | null;
	/**
	 * Pattern matching the material texture slot(s) to be compressed or converted.
	 * Passing a string (glob) is deprecated; use a RegExp instead.
	 */
	slots?: RegExp | null;
	filter?: string;
	filterScale?: number;
	resize?: vec2;
	powerOfTwo?: boolean;
	jobs?: number;
}

export interface ETC1SOptions extends GlobalOptions {
	quality?: number;
	compression?: number;
	maxEndpoints?: number;
	maxSelectors?: number;
	rdo?: boolean;
	rdoThreshold?: number;
}

export interface UASTCOptions extends GlobalOptions {
	level?: number;
	rdo?: boolean;
	rdoLambda?: number;
	rdoDictionarySize?: number;
	rdoBlockScale?: number;
	rdoStdDev?: number;
	rdoMultithreading?: boolean;
	zstd?: number;
}

const GLOBAL_DEFAULTS: Omit<GlobalOptions, 'mode'> = {
	filter: Filter.LANCZOS4,
	filterScale: 1,
	powerOfTwo: false,
	pattern: null,
	slots: null,
	// See: https://github.com/donmccurdy/glTF-Transform/pull/389#issuecomment-1089842185
	jobs: 2 * NUM_CPUS,
};

export const ETC1S_DEFAULTS: Omit<ETC1SOptions, 'mode'> = {
	quality: 128,
	compression: 1,
	rdo: true,
	rdoThreshold: 1.25,
	maxSelectors: 0,
	maxEndpoints: 0,
	...GLOBAL_DEFAULTS,
};

export const UASTC_DEFAULTS: Omit<UASTCOptions, 'mode'> = {
	level: 2,
	rdo: false,
	rdoLambda: 1.0,
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
	options = {
		...(options.mode === Mode.ETC1S ? ETC1S_DEFAULTS : UASTC_DEFAULTS),
		...options,
	};

	return createTransform(options.mode, async (doc: Document): Promise<void> => {
		const logger = doc.getLogger();

		// Confirm recent version of KTX-Software is installed.
		await checkKTXSoftware(logger);

		// Create workspace.
		const batchPrefix = uuid();
		const batchDir = join(tmp.tmpdir, 'gltf-transform');
		if (!existsSync(batchDir)) mkdirSync(batchDir);

		const basisuExtension = doc.createExtension(KHRTextureBasisu).setRequired(true);

		let numCompressed = 0;

		const limit = pLimit(options.jobs!);
		const textures = doc.getRoot().listTextures();
		const numTextures = textures.length;
		const promises = textures.map((texture, textureIndex) =>
			limit(async () => {
				const slots = listTextureSlots(texture);
				const channels = getTextureChannelMask(texture);
				const textureLabel =
					texture.getURI() ||
					texture.getName() ||
					`${textureIndex + 1}/${doc.getRoot().listTextures().length}`;
				const prefix = `ktx:texture(${textureLabel})`;
				logger.debug(`${prefix}: Slots → [${slots.join(', ')}]`);

				// FILTER: Exclude textures that don't match (a) 'slots' or (b) expected formats.

				if (typeof options.slots === 'string') {
					options.slots = micromatch.makeRe(options.slots, MICROMATCH_OPTIONS);
					logger.warn('ktx: Argument "slots" should be of type `RegExp | null`.');
				}

				const patternRe = options.pattern as RegExp | null;
				const slotsRe = options.slots as RegExp | null;

				if (texture.getMimeType() === 'image/ktx2') {
					logger.debug(`${prefix}: Skipping, already KTX.`);
					return;
				} else if (texture.getMimeType() !== 'image/png' && texture.getMimeType() !== 'image/jpeg') {
					logger.warn(`${prefix}: Skipping, unsupported texture type "${texture.getMimeType()}".`);
					return;
				} else if (slotsRe && !slots.find((slot) => slot.match(slotsRe))) {
					logger.debug(`${prefix}: Skipping, [${slots.join(', ')}] excluded by "slots" parameter.`);
					return;
				} else if (patternRe && !(texture.getURI().match(patternRe) || texture.getName().match(patternRe))) {
					logger.debug(`${prefix}: Skipping, excluded by "pattern" parameter.`);
					return;
				}

				const image = texture.getImage();
				const size = options.resize || texture.getSize();
				if (!image || !size) {
					logger.warn(`${prefix}: Skipping, unreadable texture.`);
					return;
				}

				// PREPARE: Create temporary in/out paths for the 'ktx' CLI tool, and determine
				// necessary command-line flags.

				const extension = texture.getURI()
					? FileUtils.extension(texture.getURI())
					: ImageUtils.mimeTypeToExtension(texture.getMimeType());

				const inPath = join(batchDir, `${batchPrefix}_${textureIndex}.${extension}`);
				const outPath = join(batchDir, `${batchPrefix}_${textureIndex}.ktx2`);

				const inBytes = image.byteLength;
				await fs.writeFile(inPath, Buffer.from(image));

				const params = [
					'create',
					...createParams(texture, slots, channels, size, logger, numTextures, options),
					inPath,
					outPath,
				];
				logger.debug(`${prefix}: Spawning → ktx ${params.join(' ')}`);

				// COMPRESS: Run `ktx create` CLI tool.
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const [status, stdout, stderr] = await waitExit(spawn('ktx', params as string[]));

				if (status !== 0) {
					logger.error(`${prefix}: Failed → \n\n${stderr.toString()}`);
				} else {
					// PACK: Replace image data in the glTF asset.

					texture.setImage(await fs.readFile(outPath)).setMimeType('image/ktx2');

					if (texture.getURI()) {
						texture.setURI(FileUtils.basename(texture.getURI()) + '.ktx2');
					}

					numCompressed++;
				}

				const outBytes = texture.getImage()!.byteLength;
				logger.debug(`${prefix}: ${formatBytes(inBytes)} → ${formatBytes(outBytes)} bytes`);
			}),
		);

		await Promise.all(promises);

		if (numCompressed === 0) {
			logger.warn('ktx: No textures were found, or none were selected for compression.');
		}

		const usesKTX2 = doc
			.getRoot()
			.listTextures()
			.some((t) => t.getMimeType() === 'image/ktx2');

		if (!usesKTX2) {
			basisuExtension.dispose();
		}
	});
};

/**********************************************************************************************
 * Utilities.
 */

/** Create CLI parameters from the given options. Attempts to write only non-default options. */
function createParams(
	texture: Texture,
	slots: string[],
	channels: number,
	size: vec2,
	logger: ILogger,
	numTextures: number,
	options: ETC1SOptions | UASTCOptions,
): (string | number)[] {
	const colorSpace = getTextureColorSpace(texture);
	const params: (string | number)[] = ['--generate-mipmap'];

	if (options.filter !== GLOBAL_DEFAULTS.filter) {
		params.push('--mipmap-filter', options.filter!);
	}

	if (options.filterScale !== GLOBAL_DEFAULTS.filterScale) {
		params.push('--mipmap-filter-scale', options.filterScale!);
	}

	// See: https://github.com/KhronosGroup/KTX-Software/issues/600
	const isNormalMap = slots.find((slot) => micromatch.isMatch(slot, '*normal*', MICROMATCH_OPTIONS));

	if (options.mode === Mode.UASTC) {
		const _options = options as UASTCOptions;
		params.push('--encode', 'uastc');
		params.push('--uastc-quality', _options.level!);

		if (_options.rdo && !isNormalMap) {
			params.push('--uastc-rdo');
			if (_options.rdoLambda !== UASTC_DEFAULTS.rdoLambda) {
				params.push('--uastc-rdo-l', _options.rdoLambda!);
			}
			if (_options.rdoDictionarySize !== UASTC_DEFAULTS.rdoDictionarySize) {
				params.push('--uastc-rdo-d', _options.rdoDictionarySize!);
			}
			if (_options.rdoBlockScale !== UASTC_DEFAULTS.rdoBlockScale) {
				params.push('--uastc-rdo-b', _options.rdoBlockScale!);
			}
			if (_options.rdoStdDev !== UASTC_DEFAULTS.rdoStdDev) {
				params.push('--uastc-rdo-s', _options.rdoStdDev!);
			}
			if (!_options.rdoMultithreading) {
				params.push('--uastc-rdo-m');
			}
		}

		if (_options.zstd && _options.zstd > 0) {
			params.push('--zstd', _options.zstd);
		}
	} else {
		const _options = options as ETC1SOptions;
		params.push('--encode', 'basis-lz');

		if (_options.quality !== ETC1S_DEFAULTS.quality) {
			params.push('--qlevel', _options.quality!);
		}
		if (_options.compression !== ETC1S_DEFAULTS.compression) {
			params.push('--clevel', _options.compression!);
		}
		if (_options.maxEndpoints !== ETC1S_DEFAULTS.maxEndpoints) {
			params.push('--max-endpoints', _options.maxEndpoints!);
		}
		if (_options.maxSelectors !== ETC1S_DEFAULTS.maxSelectors) {
			params.push('--max-selectors', _options.maxSelectors!);
		}
		if (!_options.rdo || isNormalMap) {
			params.push('--no-endpoint-rdo', '--no-selector-rdo');
		} else if (_options.rdoThreshold !== ETC1S_DEFAULTS.rdoThreshold) {
			params.push('--endpoint-rdo-threshold', _options.rdoThreshold!);
			params.push('--selector-rdo-threshold', _options.rdoThreshold!);
		}
	}

	// See: https://github.com/donmccurdy/glTF-Transform/issues/215
	if (colorSpace === 'srgb') {
		params.push('--assign-oetf', 'srgb', '--assign-primaries', 'bt709');
	} else if (colorSpace === 'srgb-linear') {
		params.push('--assign-oetf', 'linear', '--assign-primaries', 'bt709');
	}  else if (slots.length && !colorSpace) {
		params.push('--assign-oetf', 'linear', '--assign-primaries', 'none');
	}

	if (channels === R) {
		params.push('--format', 'R8_UNORM');
	} else if (channels === G || channels === (R | G)) {
		params.push('--format', 'R8G8_UNORM');
	} else if (!(channels & A)) {
		params.push('--format', colorSpace === 'srgb' ? 'R8G8B8_SRGB' : 'R8G8B8_UNORM');
	} else {
		params.push('--format', colorSpace === 'srgb' ? 'R8G8B8A8_SRGB' : 'R8G8B8A8_UNORM');
	}

	// Minimum size on any dimension is 4px.
	// See: https://github.com/donmccurdy/glTF-Transform/issues/502

	let width: number;
	let height: number;
	if (options.powerOfTwo) {
		width = preferredPowerOfTwo(size[0]);
		height = preferredPowerOfTwo(size[1]);
	} else {
		if (!isPowerOfTwo(size[0]) || !isPowerOfTwo(size[1])) {
			logger.warn(
				`ktx: Texture dimensions ${size[0]}x${size[1]} are NPOT, and may` +
					' fail in older APIs (including WebGL 1.0) on certain devices.',
			);
		}
		width = isMultipleOfFour(size[0]) ? size[0] : ceilMultipleOfFour(size[0]);
		height = isMultipleOfFour(size[1]) ? size[1] : ceilMultipleOfFour(size[1]);
	}

	if (width !== size[0] || height !== size[1] || options.resize) {
		if (width > 4096 || height > 4096) {
			logger.warn(
				`ktx: Resizing to nearest power of two, ${width}x${height}px. Texture dimensions` +
					' greater than 4096px may not render on some mobile devices.' +
					' Resize to a lower resolution before compressing, if needed.',
			);
		}
		params.push('--width', width, '--height', height);
	}

	if (options.jobs && options.jobs > 1 && numTextures > 1) {
		// See: https://github.com/donmccurdy/glTF-Transform/pull/389#issuecomment-1089842185
		const threads = Math.max(2, Math.min(NUM_CPUS, Math.round((3 * NUM_CPUS) / numTextures)));
		params.push('--threads', threads);
	}

	return params;
}

async function checkKTXSoftware(logger: ILogger): Promise<string> {
	if (!(await commandExists('ktx')) && !process.env.CI) {
		throw new Error(
			`Command "ktx" not found. Please install KTX-Software ${KTX_SOFTWARE_VERSION_MIN}+, ` +
				'from:\n\nhttps://github.com/KhronosGroup/KTX-Software',
		);
	}

	const [status, stdout, stderr] = await waitExit(spawn('ktx', ['--version']));

	const version = ((stdout || stderr) as string)
		.replace(/ktx version:\s+/, '')
		.replace(/~\d+/, '')
		.trim();

	if (status !== 0 || !semver.valid(semver.clean(version))) {
		throw new Error(
			`Unable to find "ktx" version. Confirm KTX-Software ${KTX_SOFTWARE_VERSION_MIN}+ is installed.`,
		);
	} else if (semver.lt(semver.clean(version)!, KTX_SOFTWARE_VERSION_MIN)) {
		logger.warn(`ktx: Expected KTX-Software >= v${KTX_SOFTWARE_VERSION_MIN}, found ${version}.`);
	} else {
		logger.debug(`ktx: Found KTX-Software ${version}.`);
	}

	return semver.clean(version)!;
}

function isPowerOfTwo(value: number): boolean {
	if (value <= 2) return true;
	return (value & (value - 1)) === 0 && value !== 0;
}

function preferredPowerOfTwo(value: number): number {
	if (value <= 4) return 4;

	const lo = floorPowerOfTwo(value);
	const hi = ceilPowerOfTwo(value);

	if (hi - value > value - lo) return lo;
	return hi;
}

function floorPowerOfTwo(value: number): number {
	return Math.pow(2, Math.floor(Math.log(value) / Math.LN2));
}

function ceilPowerOfTwo(value: number): number {
	return Math.pow(2, Math.ceil(Math.log(value) / Math.LN2));
}

function isMultipleOfFour(value: number): boolean {
	return value % 4 === 0;
}

function ceilMultipleOfFour(value: number): number {
	if (value <= 4) return 4;
	return value % 4 ? value + 4 - (value % 4) : value;
}
