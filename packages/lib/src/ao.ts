import geoao from 'geo-ambient-occlusion';
import REGL from 'regl';
import { Accessor, Document, Primitive, Transform } from '@gltf-transform/core';

const NAME = 'ao';

interface GLFactory {
	(w: number, h: number): WebGLRenderingContext;
}

export interface AOOptions {
	gl?: GLFactory;
	resolution?: number;
	samples?: number;
}

const DEFAULT_OPTIONS: AOOptions = {
	resolution: 512,
	samples: 500,
};

// A greyscale 256x1 gradient.
const TEXTURE_MIME_TYPE = 'image/png';
const TEXTURE_DATA = new Uint8Array([
	137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 1, 0, 0, 0, 0, 1, 8, 6, 0,
	0, 0, 49, 89, 112, 119, 0, 0, 0, 32, 73, 68, 65, 84, 56, 79, 99, 100, 96, 96, 248, 207, 196,
	196, 196, 0, 2, 163, 244, 104, 56, 140, 166, 131, 145, 147, 15, 24, 25, 25, 25, 0, 254, 131,
	3, 254, 243, 176, 75, 70, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
]).buffer;

/**
 * Options:
 * - **gl**: Callback taking `(width, height)` as parameters, and returning a GL instance. Optional
 * 		on web; Requires `headless-gl` in Node.js.
 * - **resolution**: Resolution of depth buffer. Default: 512.
 * - **samples**: Number of samples to draw. Default: 500.
 */
export function ao (options: AOOptions = DEFAULT_OPTIONS): Transform {
	options = {...DEFAULT_OPTIONS, ...options};

	return (doc: Document): void => {

		const logger = doc.getLogger();
		const resolution = options.resolution as number;
		const samples = options.samples as number;

		logger.debug(`${NAME}: resolution = ${resolution}; samples = ${samples}`);

		const primitives = new Set<Primitive>();
		doc.getRoot().listMeshes().forEach((mesh) => {
			mesh.listPrimitives().forEach((primitive) => (primitives.add(primitive)));
		});

		if (primitives.size === 0) {
			logger.warn(`${NAME}: No primitives found.`);
			logger.debug(`${NAME}: Complete.`);
			return;
		}

		const texture = doc.createTexture('occlusion')
		.setImage(TEXTURE_DATA)
		.setMimeType(TEXTURE_MIME_TYPE);

		let regl;
		if (options.gl) {
			const gl = options.gl(resolution, resolution);
			gl.getExtension('OES_texture_float');
			gl.getExtension('OES_element_index_uint');
			regl = REGL({gl, extensions: ['OES_texture_float', 'OES_element_index_uint']});
		}

		// TODO: Implement baking such that primitives affect other primitives, and respect
		// world transforms.
		Array.from(primitives).forEach((primitive, index) => {
			logger.debug(`${NAME}: Baking primitive ${index} / ${primitives.size}.`);

			if (primitive.getMaterial().getOcclusionTexture()) {
				// TODO: Duplicate the material if needed.
				logger.warn(
					`${NAME}: Primitive already has AO. Is it sharing a material? Skipping.`
				);
				return;
			}

			// Bake vertex AO.
			const position = primitive.getAttribute('POSITION').getArray();
			const cells = primitive.getIndices() ? primitive.getIndices().getArray() : undefined;
			const aoSampler = geoao(position, {cells, resolution, regl});
			for (let i = 0; i < samples; i++) aoSampler.sample();
			const ao = aoSampler.report();
			aoSampler.dispose();

			// Write UV set and add AO map.
			const numVertices = ao.length;
			const uv2Data = new Float32Array(numVertices * 2);
			for (let i = 0; i < numVertices; i++) {
				uv2Data[i * 2] = uv2Data[i * 2 + 1] = 1 - ao[i];
			}

			const buffer = doc.getRoot().listBuffers()[0] || doc.createBuffer('');
			const uv2 = doc.createAccessor('uv2', buffer)
			.setArray(uv2Data)
			.setType(Accessor.Type.VEC2);

			primitive.setAttribute('TEXCOORD_1', uv2);
			if (!primitive.getAttribute['TEXCOORD_0']) {
				primitive.setAttribute('TEXCOORD_0', uv2);
			}

			primitive.getMaterial().setOcclusionTexture(texture);
		});

		logger.debug(`${NAME}: Complete.`);
	};

}
