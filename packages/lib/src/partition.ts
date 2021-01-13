import { Document, Logger, Transform } from '@gltf-transform/core';

const NAME = 'partition';

export interface PartitionOptions {
	animations?: boolean | Array<string>;
	meshes?: boolean | Array<string>;
}

const DEFAULT_OPTIONS: PartitionOptions =  {
	animations: true,
	meshes: true,
};

const partition = (options: PartitionOptions = DEFAULT_OPTIONS): Transform => {

	options = {...DEFAULT_OPTIONS, ...options};

	return (doc: Document): void => {
		const logger = doc.getLogger();

		if (options.meshes !== false) partitionMeshes(doc, logger, options);
		if (options.animations !== false) partitionAnimations(doc, logger, options);

		if (!options.meshes && !options.animations) {
			logger.warn(`${NAME}: Select animations or meshes to create a partition.`);
		}

		logger.debug(`${NAME}: Complete.`);
	};

};

function partitionMeshes (doc: Document, logger: Logger, options: PartitionOptions): void {
	const existingURIs = new Set<string>(doc.getRoot().listBuffers().map((b) => b.getURI()));

	doc.getRoot().listMeshes()
		.forEach((mesh, meshIndex) => {
			if (Array.isArray(options.meshes) && !options.meshes.includes(mesh.getName())) {
				logger.debug(
					`${NAME}: Skipping mesh #${meshIndex} with name "${mesh.getName()}".`
				);
				return;
			}

			logger.debug(`${NAME}: Creating buffer for mesh "${mesh.getName()}".`);

			const buffer = doc.createBuffer(mesh.getName())
				.setURI(createBufferURI(mesh.getName() || 'mesh', existingURIs));

			mesh.listPrimitives()
				.forEach((primitive) => {
					if (primitive.getIndices()) primitive.getIndices().setBuffer(buffer);
					primitive.listAttributes()
						.forEach((attribute) => attribute.setBuffer(buffer));
					primitive.listTargets()
						.forEach((primTarget) => {
							primTarget.listAttributes()
								.forEach((attribute) => attribute.setBuffer(buffer));
						});
				});
		});
}

function partitionAnimations (doc: Document, logger: Logger, options: PartitionOptions): void {
	const existingURIs = new Set<string>(doc.getRoot().listBuffers().map((b) => b.getURI()));

	doc.getRoot().listAnimations()
		.forEach((anim, animIndex) => {
			if (Array.isArray(options.animations) && !options.animations.includes(anim.getName())) {
				logger.debug(
					`${NAME}: Skipping animation #${animIndex} with name "${anim.getName()}".`
				);
				return;
			}

			logger.debug(`${NAME}: Creating buffer for animation "${anim.getName()}".`);

			const buffer = doc.createBuffer(anim.getName())
				.setURI(createBufferURI(anim.getName() || 'animation', existingURIs));

			anim.listSamplers()
				.forEach((sampler) => {
					sampler.getInput().setBuffer(buffer);
					sampler.getOutput().setBuffer(buffer);
				});
		});
}

function createBufferURI (basename: string, existing: Set<string>): string {
	let uri = `${basename}.bin`;
	let i = 1;
	while (existing.has(uri)) uri = `${basename}_${i++}.bin`;
	return uri;
}

export { partition };
