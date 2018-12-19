import { GLTFContainer, GLTFUtil, LoggerVerbosity, AccessorComponentType, BufferViewTarget } from '@gltf-transform/core';
import * as geoaoNamespace from 'geo-ambient-occlusion';
import * as reglNamespace from 'regl';

const REGL = reglNamespace['default'] as Function;
const geoao = geoaoNamespace['default'] as Function;
const logger = GLTFUtil.createLogger('@gltf-transform/ao', LoggerVerbosity.INFO);

interface GLFactory {
    (w: number, h: number): WebGLRenderingContext;
}

interface IOcclusionOptions {
    gl?: GLFactory;
    resolution: number;
    samples: number;
}

const DEFAULT_OPTIONS: IOcclusionOptions = {
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

function ao (container: GLTFContainer, options: IOcclusionOptions): GLTFContainer {
    options = {...DEFAULT_OPTIONS, ...options};
    const {resolution, samples} = options;
    logger.info(`Resolution: ${resolution}; Samples: ${samples}`);

    const primitives = [];
    const meshes = container.json.meshes || [];
    meshes.forEach((mesh) => {
        mesh.primitives.forEach((primitive) => {
            const position = container.getAccessorArray(primitive.attributes['POSITION']);
            const cells = primitive.indices !== undefined ? container.getAccessorArray(primitive.indices) : undefined;
            primitives.push({position, cells, def: primitive});
        })
    });

    if (primitives.length === 0) {
        logger.warn('No primitives found.');
        return;
    }

    GLTFUtil.addImage(container, 'occlusion', TEXTURE_DATA, TEXTURE_MIME_TYPE);
    container.json.textures.push({source: container.json.images.length - 1});
    const occlusionTextureIndex = container.json.textures.length - 1;

    let regl;
    if (options.gl) {
        const gl = options.gl(resolution, resolution);
        gl.getExtension('OES_texture_float');
        gl.getExtension('OES_element_index_uint');
        regl = REGL({gl, extensions: ['OES_texture_float', 'OES_element_index_uint']});
    }

    // TODO: Implement baking such that primitives affect other primitives, and respect
    // world transforms.
    primitives.forEach((primitive, index) => {
        logger.info(`Baking primitive ${index} / ${primitives.length}.`);

        const primitiveDef: GLTF.IMeshPrimitive = primitive.def;
        if (container.json.materials[primitiveDef.material].occlusionTexture) {
            // TODO: Duplicate the material if needed.
            logger.error(`Primitive material already has AO map, and may be shared by another primitive. Skipping.`);
            return;
        }

        // Bake vertex AO.
        const {position, cells} = primitive;
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
        GLTFUtil.addAccessor(
            container,
            uv2Data,
            'VEC2' as GLTF.AccessorType.VEC2,
            AccessorComponentType.FLOAT,
            numVertices,
            BufferViewTarget.ARRAY_BUFFER
        );
        const accessorIndex = container.json.accessors.length - 1;
        primitiveDef.attributes['TEXCOORD_1'] = accessorIndex;
        if (primitiveDef.attributes['TEXCOORD_0'] === undefined) {
            primitiveDef.attributes['TEXCOORD_0'] = accessorIndex;
        }
        container.json.materials[primitiveDef.material].occlusionTexture = {index: occlusionTextureIndex};
    });

    logger.info('Finished baking per-vertex occlusion.');
    return container;
}

export { ao };
