const fs = require('fs');
const tmp = require('tmp');
const minimatch = require('minimatch');
const { spawnSync } = require('child_process');
const { BufferUtils, ImageUtils, FileUtils, PropertyType } = require('@gltf-transform/core');
const { TextureBasisu } = require('@gltf-transform/extensions');

tmp.setGracefulCleanup();

const Mode = {
	ETC1S: 'etc1s',
	UASTC: 'uastc',
};

const Filter = {
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

const toktx = function (options) {
	return (doc) =>  {
		const logger = doc.getLogger();

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

				const inExtension = texture.getURI()
					? FileUtils.extension(texture.getURI())
					: ImageUtils.mimeTypeToExtension(texture.getMimeType());
				const inPath = tmp.tmpNameSync({postfix: '.' + inExtension});
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

				numCompressed++;

				logger.debug(`• ${inBytes} → ${texture.getImage().byteLength} bytes.`);
			});

		if (numCompressed === 0) {
			logger.warn('No textures were found, or none were selected for compression.');
		}
	};
}

function getTextureSlots (doc, texture) {
	return doc.getGraph().getLinks()
		.filter((link) => link.getChild() === texture)
		.map((link) => link.getName())
		.filter((slot) => slot !== 'texture')
}

function createParams (slots, options) {
	const params = [];
	params.push('--genmipmap');
	params.push('--filter', options.filter);
	params.push('--fscale', options.filterScale);

	if (options.mode === Mode.UASTC) {
		params.push('--uastc', options.level);
		params.push('--uastc_rdo_q', options.rdoQuality);
		params.push('--uastc_rdo_d', options.rdoDictsize)
		if (options.zstd > 0) params.push('--zcmp', options.zstd);
	} else {
		params.push('--bcmp');
		params.push('--qlevel', options.quality);
		params.push('--clevel', options.compression);

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

	if (!slots.find((slot) => minimatch(slot, '*(color|emissive)*', {nocase: true}))) {
		params.push('--linear');
	}

	return params;
}

module.exports = {toktx, Filter, Mode};
