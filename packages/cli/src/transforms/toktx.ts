/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const minimatch = require('minimatch');
const tmp = require('tmp');

import { BufferUtils, Document, FileUtils, ImageUtils, Logger, Texture, Transform, vec2 } from '@gltf-transform/core';
import { TextureBasisu } from '@gltf-transform/extensions';
import { commandExistsSync, formatBytes, spawnSync } from '../util';

tmp.setGracefulCleanup();

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
}

export interface UASTCOptions extends GlobalOptions {
	level: number;
	rdoQuality: number;
	rdoDictSize: number;
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
	rdoQuality: 1,
	rdoDictsize: 32768,
	...GLOBAL_DEFAULTS,
};

/**********************************************************************************************
 * Implementation.
 */

export const toktx = function (options: ETC1SOptions | UASTCOptions): Transform {
	options = {...(options.mode === Mode.ETC1S ? ETC1S_DEFAULTS : UASTC_DEFAULTS), ...options};

	return (doc: Document): void =>  {
		const logger = doc.getLogger();

		if (!commandExistsSync('toktx') && !process.env.CI) {
			throw new Error('Command "toktx" not found. Please install KTX-Software, from:\n\nhttps://github.com/KhronosGroup/KTX-Software');
		}

		const basisuExtension = doc.createExtension(TextureBasisu).setRequired(true);

		let numCompressed = 0;

		doc.getRoot()
			.listTextures()
			.forEach((texture, textureIndex) => {
				const slots = getTextureSlots(doc, texture);
				const textureLabel = texture.getURI()
					|| texture.getName()
					|| `${textureIndex + 1}/${doc.getRoot().listTextures().length}`;
				logger.debug(`Texture ${textureLabel} (${slots.join(', ')})`);

				// FILTER: Exclude textures that don't match the 'slots' glob, or are already KTX.

				if (texture.getMimeType() === 'image/ktx2') {
					logger.debug('• Skipping, already KTX.');
					return;
				} else if (options.slots !== '*' && !slots.find((slot) => minimatch(slot, options.slots, {nocase: true}))) {
					logger.debug(`• Skipping, excluded by pattern "${options.slots}".`);
					return;
				}

				// PREPARE: Create temporary in/out paths for the 'toktx' CLI tool, and determine
				// necessary commandline flags.

				const extension = texture.getURI()
					? FileUtils.extension(texture.getURI())
					: ImageUtils.mimeTypeToExtension(texture.getMimeType());
				const inPath = tmp.tmpNameSync({postfix: '.' + extension});
				const outPath = tmp.tmpNameSync({postfix: '.ktx2'});

				const inBytes = texture.getImage().byteLength;
				fs.writeFileSync(inPath, Buffer.from(texture.getImage()));

				const params = [
					...createParams(slots, texture.getSize(), logger, options),
					outPath,
					inPath
				];
				logger.debug(`• toktx ${params.join(' ')}`);

				// COMPRESS: Run `toktx` CLI tool.

				const {status, error} = spawnSync('toktx', params, {stdio: [process.stderr]});

				if (status !== 0) {
					logger.error('• Texture compression failed.');
					throw error || new Error('Texture compression failed');
				}

				// PACK: Replace image data in the glTF asset.

				texture
					.setImage(BufferUtils.trim(fs.readFileSync(outPath)))
					.setMimeType('image/ktx2');

				if (texture.getURI()) {
					texture.setURI(FileUtils.basename(texture.getURI()) + '.ktx2');
				}

				numCompressed++;

				const outBytes = texture.getImage().byteLength;
				logger.debug(`• ${formatBytes(inBytes)} → ${formatBytes(outBytes)} bytes.`);
			});

		if (numCompressed === 0) {
			logger.warn('No textures were found, or none were selected for compression.');
		}

		if (!doc.getRoot().listTextures().find((t) => t.getMimeType() === 'image/ktx2')) {
			basisuExtension.dispose();
		}
	};
}

/**********************************************************************************************
 * Utilities.
 */

/** Returns names of all texture slots using the given texture. */
function getTextureSlots (doc: Document, texture: Texture): string[] {
	return doc.getGraph().getLinks()
		.filter((link) => link.getChild() === texture)
		.map((link) => link.getName())
		.filter((slot) => slot !== 'texture')
}

/** Create CLI parameters from the given options. Attempts to write only non-default options. */
function createParams (slots: string[], size: vec2, logger: Logger, options): string[] {
	const params = [];
	params.push('--genmipmap');
	if (options.filter !== GLOBAL_DEFAULTS.filter) params.push('--filter', options.filter);
	if (options.filterScale !== GLOBAL_DEFAULTS.filterScale) params.push('--fscale', options.filterScale);

	if (options.mode === Mode.UASTC) {
		params.push('--uastc', options.level);
		if (options.rdoQuality !== UASTC_DEFAULTS.rdoQuality) params.push('--uastc_rdo_q', options.rdoQuality);
		if (options.rdoDictsize !== UASTC_DEFAULTS.rdoDictsize) params.push('--uastc_rdo_d', options.rdoDictsize)
		if (options.zstd > 0) params.push('--zcmp', options.zstd);
	} else {
		params.push('--bcmp');
		if (options.quality !== ETC1S_DEFAULTS.quality) params.push('--qlevel', options.quality);
		if (options.compression !== ETC1S_DEFAULTS.compression) params.push('--clevel', options.compression);
		if (options.maxEndpoints) params.push('--max_endpoints', options.maxEndpoints);
		if (options.maxSelectors) params.push('--max_selectors', options.maxSelectors);

		if (options.rdoOff) {
			params.push('--no_endpoint_rdo', '--no_selector_rdo')
		} else if (options.rdoThreshold) {
			params.push('--endpoint_rdo_threshold', options.rdoThreshold);
			params.push('--selector_rdo_threshold', options.rdoThreshold);
		}

		if (slots.find((slot) => minimatch(slot, '*normal*', {nocase: true}))) {
			params.push('--normal_map');
		}
	}

	if (slots.length
			&& !slots.find((slot) => minimatch(slot, '*{color,emissive}*', {nocase: true}))) {
		params.push('--linear');
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
