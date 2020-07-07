const fs = require('fs');
const tmp = require('tmp');
const { spawnSync } = require('child_process');
const { BufferUtils, ImageUtils, FileUtils } = require('@gltf-transform/core');
const { TextureBasisu } = require('@gltf-transform/extensions');

const TOKTX_OPTIONS = {
	clevel: 1,
	qlevel: 128,
};

tmp.setGracefulCleanup();

const toktx = function (options) {
	options = {...TOKTX_OPTIONS, ...options};

	return (doc) =>  {
		const logger = doc.getLogger();

		doc.createExtension(TextureBasisu);
		doc.getRoot()
			.listTextures()
			.forEach((texture) => {
				const inExtension = texture.getURI()
					? FileUtils.extension(texture.getURI())
					: ImageUtils.mimeTypeToExtension(texture.getMimeType());
				const inPath = tmp.tmpNameSync({postfix: '.' + inExtension});
				const outPath = tmp.tmpNameSync({postfix: '.ktx2'});

				const textureLabel = texture.getURI() || texture.getName();
				logger.debug(`Compressing texture "${textureLabel}" as "${inPath}" → "${outPath}".`);

				const inBytes = texture.getImage().byteLength;
				fs.writeFileSync(inPath, Buffer.from(texture.getImage()));

				const {status, error} = spawnSync('toktx', [
					'--genmipmap',
					'--bcmp',
					'--clevel', options.clevel,
					'--qlevel', options.qlevel,
					outPath,
					inPath,
				], {stdio: [process.stdin, process.stdout, process.stderr]});

				if (status !== 0) {
					logger.error('Texture compression failed');
					throw error || new Error('Texture compression failed');
				}

				texture
					.setImage(BufferUtils.trim(fs.readFileSync(outPath)))
					.setMimeType('image/ktx2');

				logger.debug(`Compressed texture "${textureLabel}": ${inBytes} → ${texture.getImage().byteLength} bytes.`);
			});
	};
}

module.exports = {toktx, TOKTX_OPTIONS};
