import { Accessor, Container, CoreUtils, LoggerVerbosity, Primitive, Vector3 } from '@gltf-transform/core';

const logger = CoreUtils.createLogger('@gltf-transform/colorspace', LoggerVerbosity.INFO);

interface IColorspaceOptions {
    inputEncoding: string;
}

export function colorspace (container: Container, options: IColorspaceOptions): Container {

    if (options.inputEncoding === 'linear') {
        logger.info('Vertex colors already linear. Skipping conversion.');
        return container;
    }

    if (options.inputEncoding !== 'sRGB') {
		logger.error(
			`Unknown input encoding "${options.inputEncoding}" – should be "sRGB" or "linear". `
			+ 'Skipping conversion.'
		);
        return container;
    }

    const converted = new Set<Accessor>();

	// Source: THREE.Color
	function sRGBToLinear( c: number ): number {

		return ( c < 0.04045 )
			? c * 0.0773993808
			: Math.pow( c * 0.9478672986 + 0.0521327014, 2.4 );

	}

	function updatePrimitive(primitive: Primitive): void {
		const color = new Vector3();
		let attribute: Accessor;
		for (let i = 0; (attribute = primitive.getAttribute(`COLOR_${i}`)); i++) {
			if (converted.has(attribute)) continue;

			for (let j = 0; j < attribute.getCount(); j++) {
				attribute.getXYZ(j, color);
				color.x = sRGBToLinear(color.x);
				color.y = sRGBToLinear(color.y);
				color.z = sRGBToLinear(color.z);
				attribute.setXYZ(j, color);
			}

			converted.add(attribute);
		}
	}

	container.getRoot()
		.listMeshes()
		.forEach((mesh) => mesh.listPrimitives().forEach(updatePrimitive));

    logger.info(`Corrected vertex colors from ${options.inputEncoding} to linear.`);

    return container;

}
