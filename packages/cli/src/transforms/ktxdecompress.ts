import { type Document, FileUtils, ImageUtils, type Transform, uuid } from '@gltf-transform/core';
import { KHRTextureBasisu } from '@gltf-transform/extensions';
import { createTransform } from '@gltf-transform/functions';
import fs, { rm } from 'fs/promises';
import os from 'os';
import pLimit from 'p-limit';
import { join } from 'path';
import tmp from 'tmp';
import { formatBytes, spawn, waitExit } from '../util.js';
import { checkKTXSoftware } from './toktx.js';

const NUM_CPUS = os.cpus().length || 1; // microsoft/vscode#112122

interface KTXDecompressOptions {
	jobs?: number;
	/**
	 * Whether to clean up temporary files created during texture compression. See
	 * verbose log output for temporary file paths. Default: true.
	 */
	cleanup?: boolean;
}

const KTX_DECOMPRESS_DEFAULTS: KTXDecompressOptions = {
	// See: https://github.com/donmccurdy/glTF-Transform/pull/389#issuecomment-1089842185
	jobs: 2 * NUM_CPUS,
	cleanup: true,
};

export const ktxdecompress = function (options: KTXDecompressOptions = KTX_DECOMPRESS_DEFAULTS): Transform {
	options = { ...KTX_DECOMPRESS_DEFAULTS, ...options };

	return createTransform('ktxdecompress', async (doc: Document): Promise<void> => {
		const logger = doc.getLogger();

		// Confirm recent version of KTX-Software is installed.
		await checkKTXSoftware(logger);

		// Create workspace. Avoid 'unsafeCleanup' and 'setGracefulCleanup', which
		// are not working as expected and are slated for removal:
		// https://github.com/raszi/node-tmp/pull/281
		const batchPrefix = uuid();
		const batchDir = tmp.dirSync({ prefix: 'gltf-transform-' });

		const basisuExtension = doc.createExtension(KHRTextureBasisu);

		const limit = pLimit(options.jobs!);
		const textures = doc.getRoot().listTextures();
		const promises = textures.map((texture, textureIndex) =>
			limit(async () => {
				const textureLabel =
					texture.getURI() ||
					texture.getName() ||
					`${textureIndex + 1}/${doc.getRoot().listTextures().length}`;
				const prefix = `ktx:texture(${textureLabel})`;

				const srcMimeType = texture.getMimeType();
				if (srcMimeType !== 'image/ktx2') return;

				const srcImage = texture.getImage()!;
				const srcExtension = texture.getURI()
					? FileUtils.extension(texture.getURI())
					: ImageUtils.mimeTypeToExtension(srcMimeType);
				const srcSize = texture.getSize();
				const srcBytes = srcImage ? srcImage.byteLength : null;

				if (!srcImage || !srcSize || !srcBytes) {
					logger.warn(`${prefix}: Skipping, unreadable texture.`);
					return;
				}

				// PREPARE: Create temporary in/out paths for the 'ktx' CLI tool, and determine
				// necessary command-line flags.

				const srcPath = join(batchDir.name, `${batchPrefix}_${textureIndex}.${srcExtension}`);
				const dstPath = join(batchDir.name, `${batchPrefix}_${textureIndex}.png`);

				await fs.writeFile(srcPath, srcImage);

				// COMPRESS: Run `ktx create` CLI tool.
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const [status, _stdout, stderr] = await waitExit(spawn('ktx', ['extract', srcPath, dstPath]));

				if (status !== 0) {
					logger.error(`${prefix}: Failed → \n\n${stderr.toString()}`);
				} else {
					// PACK: Replace image data in the glTF asset.
					texture.setImage(await fs.readFile(dstPath)).setMimeType('image/png');
					if (texture.getURI()) {
						texture.setURI(FileUtils.basename(texture.getURI()) + '.png');
					}
				}

				const dstBytes = texture.getImage()!.byteLength;
				logger.debug(`${prefix}: ${formatBytes(srcBytes)} → ${formatBytes(dstBytes)} bytes`);
			}),
		);

		await Promise.all(promises);

		if (options.cleanup) {
			await rm(batchDir.name, { recursive: true });
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
