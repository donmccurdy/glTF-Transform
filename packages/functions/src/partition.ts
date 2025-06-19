import { type Document, type ILogger, PropertyType, type Transform } from '@gltf-transform/core';
import { prune } from './prune.js';
import { assignDefaults, createTransform } from './utils.js';

const NAME = 'partition';

export interface PartitionOptions {
	animations?: boolean | Array<string>;
	meshes?: boolean | Array<string>;
}

const PARTITION_DEFAULTS: Required<PartitionOptions> = {
	animations: true,
	meshes: true,
};

/**
 * Partitions the binary payload of a glTF file so separate mesh or animation data is in separate
 * `.bin` {@link Buffer}s. This technique may be useful for engines that support lazy-loading
 * specific binary resources as needed over the application lifecycle.
 *
 * Example:
 *
 * ```ts
 * document.getRoot().listBuffers(); // → [Buffer]
 *
 * await document.transform(partition({meshes: true}));
 *
 * document.getRoot().listBuffers(); // → [Buffer, Buffer, ...]
 * ```
 *
 * @category Transforms
 */
export function partition(_options: PartitionOptions = PARTITION_DEFAULTS): Transform {
	const options = assignDefaults(PARTITION_DEFAULTS, _options);

	return createTransform(NAME, async (doc: Document): Promise<void> => {
		const logger = doc.getLogger();

		if (options.meshes !== false) partitionMeshes(doc, logger, options);
		if (options.animations !== false) partitionAnimations(doc, logger, options);

		if (!options.meshes && !options.animations) {
			logger.warn(`${NAME}: Select animations or meshes to create a partition.`);
		}

		await doc.transform(prune({ propertyTypes: [PropertyType.BUFFER] }));

		logger.debug(`${NAME}: Complete.`);
	});
}

function partitionMeshes(doc: Document, logger: ILogger, options: Required<PartitionOptions>): void {
	const existingURIs = new Set<string>(
		doc
			.getRoot()
			.listBuffers()
			.map((b) => b.getURI()),
	);

	doc.getRoot()
		.listMeshes()
		.forEach((mesh, meshIndex) => {
			if (Array.isArray(options.meshes) && !options.meshes.includes(mesh.getName())) {
				logger.debug(`${NAME}: Skipping mesh #${meshIndex} with name "${mesh.getName()}".`);
				return;
			}

			logger.debug(`${NAME}: Creating buffer for mesh "${mesh.getName()}".`);

			const buffer = doc
				.createBuffer(mesh.getName())
				.setURI(createBufferURI(mesh.getName() || 'mesh', existingURIs));

			mesh.listPrimitives().forEach((primitive) => {
				const indices = primitive.getIndices();
				if (indices) indices.setBuffer(buffer);
				primitive.listAttributes().forEach((attribute) => attribute.setBuffer(buffer));
				primitive.listTargets().forEach((primTarget) => {
					primTarget.listAttributes().forEach((attribute) => attribute.setBuffer(buffer));
				});
			});
		});
}

function partitionAnimations(doc: Document, logger: ILogger, options: Required<PartitionOptions>): void {
	const existingURIs = new Set<string>(
		doc
			.getRoot()
			.listBuffers()
			.map((b) => b.getURI()),
	);

	doc.getRoot()
		.listAnimations()
		.forEach((anim, animIndex) => {
			if (Array.isArray(options.animations) && !options.animations.includes(anim.getName())) {
				logger.debug(`${NAME}: Skipping animation #${animIndex} with name "${anim.getName()}".`);
				return;
			}

			logger.debug(`${NAME}: Creating buffer for animation "${anim.getName()}".`);

			const buffer = doc
				.createBuffer(anim.getName())
				.setURI(createBufferURI(anim.getName() || 'animation', existingURIs));

			anim.listSamplers().forEach((sampler) => {
				const input = sampler.getInput();
				const output = sampler.getOutput();
				if (input) input.setBuffer(buffer);
				if (output) output.setBuffer(buffer);
			});
		});
}

const SANITIZE_BASENAME_RE = /[^\w0–9-]+/g;

function createBufferURI(basename: string, existing: Set<string>): string {
	basename = basename.replace(SANITIZE_BASENAME_RE, '');
	let uri = `${basename}.bin`;
	let i = 1;
	while (existing.has(uri)) uri = `${basename}_${i++}.bin`;
	existing.add(uri);
	return uri;
}
