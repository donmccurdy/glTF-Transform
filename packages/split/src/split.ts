import { Container, Logger, LoggerVerbosity } from '@gltf-transform/core';

const split = function (container: Container, meshes: Array<string>): void {

	const logger = new Logger('@gltf-transform/split', LoggerVerbosity.INFO);

	container.getRoot().listMeshes()
		.forEach((mesh) => {
			if (!mesh.getName() || !meshes.includes(mesh.getName())) return;

			logger.info(`📦  ${mesh.getName()}`);
			const buffer = container.createBuffer(mesh.getName())
				.setURI(`${mesh.getName()}.bin`);

			mesh.listPrimitives()
				.forEach((primitive) => {
					if (primitive.getIndices()) {
						primitive.getIndices().setBuffer(buffer);
					}
					primitive.listAttributes()
						.forEach((attribute) => attribute.setBuffer(buffer));
				})
		});
}

export { split };
