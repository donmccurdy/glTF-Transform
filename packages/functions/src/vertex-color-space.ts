import type { Accessor, Document, Primitive, Transform, vec3 } from '@gltf-transform/core';
import { createTransform } from './utils.js';

const NAME = 'vertexColorSpace';

/** Options for the {@link vertexColorSpace} function. */
export interface ColorSpaceOptions {
	/** Input color space of vertex colors, to be converted to "srgb-linear". Required. */
	inputColorSpace: 'srgb' | 'srgb-linear' | 'sRGB';
	/** @deprecated Renamed to 'colorSpace'. */
	inputEncoding?: 'srgb' | 'srgb-linear' | 'sRGB';
}

/** @deprecated Renamed to {@link vertexColorSpace}. */
export const colorspace = vertexColorSpace;

/**
 * Vertex color color space correction. The glTF format requires vertex colors to be stored
 * in Linear Rec. 709 D65 color space, and this function provides a way to correct vertex
 * colors that are (incorrectly) stored in sRGB.
 *
 * Example:
 *
 * ```typescript
 * import { vertexColorSpace } from '@gltf-transform/functions';
 *
 * await document.transform(
 *   vertexColorSpace({ inputColorSpace: 'srgb' })
 * );
 * ```
 *
 * @category Transforms
 */
export function vertexColorSpace(options: ColorSpaceOptions): Transform {
	return createTransform(NAME, (doc: Document): void => {
		const logger = doc.getLogger();

		const inputColorSpace = (options.inputColorSpace || options.inputEncoding || '').toLowerCase();

		if (inputColorSpace === 'srgb-linear') {
			logger.info(`${NAME}: Vertex colors already linear. Skipping conversion.`);
			return;
		}

		if (inputColorSpace !== 'srgb') {
			logger.error(
				`${NAME}: Unknown input color space "${inputColorSpace}" – should be "srgb" or ` +
					'"srgb-linear". Skipping conversion.'
			);
			return;
		}

		const converted = new Set<Accessor>();

		// Source: THREE.Color
		function sRGBToLinear(c: number): number {
			return c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4);
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
	});
}
