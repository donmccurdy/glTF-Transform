/* eslint-disable @typescript-eslint/no-var-requires */
const { spawnSync } = require('child_process');
const fs = require('fs');
const minimatch = require('minimatch');
const tmp = require('tmp');

import { sync as commandExistsSync } from 'command-exists';
import { BufferUtils, Document, FileUtils, ImageUtils, Texture, Transform } from '@gltf-transform/core';
import { TextureBasisu } from '@gltf-transform/extensions';
import { formatBytes } from '../util';

tmp.setGracefulCleanup();

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

const GLOBAL_OPTIONS = {
	filter: Filter.LANCZOS4,
	filterScale: 1,
};

export const ETC1S_DEFAULTS = {
	quality: 128,
	compression: 1,
	...GLOBAL_OPTIONS,
};

export const UASTC_DEFAULTS = {
	level: 2,
	rdoQuality: 1,
	rdoDictsize: 32768,
	...GLOBAL_OPTIONS,
};

export const toktx = function (options): Transform {
	return (doc: Document): void =>  {
		const logger = doc.getLogger();

		if (!commandExistsSync('toktx') && !process.env.CI) {
			throw new Error('Command "toktx" not found. Please install KTX-Software, from:\n\nhttps://github.com/KhronosGroup/KTX-Software');
		}

		doc.createExtension(TextureBasisu);

		let numCompressed = 0;

		doc.getRoot()
			.listTextures()
			.forEach((texture, textureIndex) => {
				const slots = getTextureSlots(doc, texture);
				const textureLabel = texture.getURI()
					|| texture.getName()
					|| `${textureIndex + 1}/${doc.getRoot().listTextures().length}`;
				logger.debug(`Texture ${textureLabel} (${slots.join(', ')})`);

				// Exclude textures that don't match the 'slots' glob, or are already KTX.
				if (texture.getMimeType() === 'image/ktx2') {
					logger.debug('• Skipping, already KTX.');
					return;
				} else if (options.slots !== '*' && !slots.find((slot) => minimatch(slot, options.slots, {nocase: true}))) {
					logger.debug(`• Skipping, excluded by pattern "${options.slots}".`);
					return;
				}

				// Create temporary in/out paths for the 'toktx' CLI tool.
				const extension = texture.getURI()
					? FileUtils.extension(texture.getURI())
					: ImageUtils.mimeTypeToExtension(texture.getMimeType());
				const inPath = tmp.tmpNameSync({postfix: '.' + extension});
				const outPath = tmp.tmpNameSync({postfix: '.ktx2'});

				const inBytes = texture.getImage().byteLength;
				fs.writeFileSync(inPath, Buffer.from(texture.getImage()));

				const params = [...createParams(slots, options), outPath, inPath];
				logger.debug(`• toktx ${params.join(' ')}`);

				// Run `toktx` CLI tool.
				const {status, error} = spawnSync('toktx', params, {stdio: [process.stderr]});

				if (status !== 0) {
					logger.error('• Texture compression failed.');
					throw error || new Error('Texture compression failed');
				}

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
	};
}

/** Returns names of all texture slots using the given texture. */
function getTextureSlots (doc: Document, texture: Texture): string[] {
	return doc.getGraph().getLinks()
		.filter((link) => link.getChild() === texture)
		.map((link) => link.getName())
		.filter((slot) => slot !== 'texture')
}

/** Create CLI parameters from the given options. Attempts to write only non-default options. */
function createParams (slots: string[], options): string[] {
	const params = [];
	params.push('--genmipmap');
	if (options.filter !== GLOBAL_OPTIONS.filter) params.push('--filter', options.filter);
	if (options.filterScale !== GLOBAL_OPTIONS.filterScale) params.push('--fscale', options.filterScale);

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

	if (!slots.find((slot) => minimatch(slot, '*{color,emissive}*', {nocase: true}))) {
		params.push('--linear');
	}

	return params;
}
