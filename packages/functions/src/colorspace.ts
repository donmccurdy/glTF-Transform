import { Accessor, Document, Primitive, Transform, vec3 } from '@gltf-transform/core';

const NAME = 'colorspace';

/** Options for the {@link colorspace} function. */
export interface ColorspaceOptions {
	/** Must be `"sRGB"`. Required. */
    inputEncoding: string;
}

/**
 * Vertex color colorspace correction. The glTF format requires vertex colors to be stored
 * as linear values, and this function provides a way to correct vertex colors that are
 * (incorrectly) sRGB.
 */
export function colorspace (options: ColorspaceOptions): Transform {

	return (doc: Document): void => {

		const logger = doc.getLogger();

		if (options.inputEncoding === 'linear') {
			logger.info(`${NAME}: Vertex colors already linear. Skipping conversion.`);
			return;
		}

		if (options.inputEncoding !== 'sRGB') {
			logger.error(
				`${NAME}: Unknown input encoding "${options.inputEncoding}" – should be "sRGB" or `
				+ '"linear". Skipping conversion.'
			);
			return;
		}

		const converted = new Set<Accessor>();

		// Source: THREE.Color
		function sRGBToLinear( c: number ): number {

			return ( c < 0.04045 )
				? c * 0.0773993808
				: Math.pow( c * 0.9478672986 + 0.0521327014, 2.4 );

		}

		function updatePrimitive(primitive: Primitive): void {
			const color = [0, 0, 0] as vec3;
			let attribute: Accessor | null;
			for (let i = 0; (attribute = primitive.getAttribute(`COLOR_${i}`)); i++) {
				if (converted.has(attribute)) continue;

				for (let j = 0; j < attribute.getCount(); j++) {
					attribute.getElement(j, color);
					color[0] = sRGBToLinear(color[0]);
					color[1] = sRGBToLinear(color[1]);
					color[2] = sRGBToLinear(color[2]);
					attribute.setElement(j, color);
				}

				converted.add(attribute);
			}
		}

		doc.getRoot()
			.listMeshes()
			.forEach((mesh) => mesh.listPrimitives().forEach(updatePrimitive));

		logger.debug(`${NAME}: Complete.`);

	};

}
