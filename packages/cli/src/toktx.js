const fs = require('fs');
const tmp = require('tmp');
const minimatch = require('minimatch');
const { spawnSync } = require('child_process');
const { BufferUtils, ImageUtils, FileUtils, PropertyType } = require('@gltf-transform/core');
const { TextureBasisu } = require('@gltf-transform/extensions');

const Mode = {
	ETC1S: 'etc1s',
	UASTC: 'uastc',
};

const TOKTX_DEFAULTS = {
	mode: Mode.ETC1S,
	quality: 0.5,
	zstd: 0,
	slots: '*',
};

tmp.setGracefulCleanup();

const toktx = function (options) {
	options = {...TOKTX_DEFAULTS, ...options};

	return (doc) =>  {
		const logger = doc.getLogger();

		doc.createExtension(TextureBasisu);

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
					logger.debug(`• Skipping, excluded by pattern "${options.slots}".`)
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

				logger.debug(`• ${inBytes} → ${texture.getImage().byteLength} bytes.`);
			});
	};
}

function getTextureSlots (doc, texture) {
	return doc.getGraph().getLinks()
		.filter((link) => link.getChild() === texture)
		.map((link) => link.getName())
		.filter((slot) => slot !== 'texture')
}

function createParams (slots, options) {
	const params = ['--genmipmap'];

	if (options.mode === Mode.UASTC) {
		params.push('--uastc', Math.round(lerp(0, 4, options.quality)));
		if (options.zstd > 0) params.push('--zcmp', options.zstd);
	} else {
		params.push('--bcmp');
		params.push('--clevel', Math.round(mlerp(0, 1, 5, options.quality)));
		params.push('--qlevel', Math.round(lerp(1, 255, options.quality)));

		if (slots.find((slot) => minimatch(slot, '*normal*', {nocase: true}))) {
			params.push('--linear', '--normal_map');
		}
	}

	return params;
}

function lerp(v0, v1, t) {
    return v0 * (1 - t) + v1 * t;
}

/** lerp given a specified midpoint to use for 0.5. */
function mlerp(v0, v1, v2, t) {
	if (t > 0.5) {
		return lerp(v1, v2, (t - 0.5) * 2);
	}
	return lerp(v0, v1, t * 2);
}

module.exports = {toktx, Mode, TOKTX_DEFAULTS};
