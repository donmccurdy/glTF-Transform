import { GLTFContainer, GLTFUtil, LoggerVerbosity, AccessorType, AccessorComponentType, BufferViewTarget } from 'gltf-transform-util';
import * as geoaoNamespace from 'geo-ambient-occlusion';
import * as reglNamespace from 'regl';

const REGL = reglNamespace['default'] as Function;
const geoao = geoaoNamespace['default'] as Function;
const logger = GLTFUtil.createLogger('gltf-transform-occlusion-vertex', LoggerVerbosity.INFO);

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

const TEXTURE_MIME_TYPE = 'image/png';
const TEXTURE_DATA = 'iVBORw0KGgoAAAANSUhEUgAAAQAAAAABCAYAAAAxWXB3AAAAIElEQVQ4T2NkYGD4z8TExAACo/RoOIymg5GTDxgZGRkA/oMD/vOwS0YAAAAASUVORK5CYII=';

function getTextureBuffer (): ArrayBuffer {
    const buffer = new ArrayBuffer(TEXTURE_DATA.length);
    const array = new Uint8Array(buffer);
    for (let i = 0; i < TEXTURE_DATA.length; i++) {
        array[i] = TEXTURE_DATA.charCodeAt(i);
    }
    return buffer;
}

let aoTextureBuffer;

function occlusionVertex (container: GLTFContainer, options: IOcclusionOptions): GLTFContainer {
    options = {...DEFAULT_OPTIONS, ...options};
    aoTextureBuffer = aoTextureBuffer || getTextureBuffer();
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

    container.addImage('occlusion', aoTextureBuffer, TEXTURE_MIME_TYPE);
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
        container.addAccessor(uv2Data, AccessorType.VEC2, AccessorComponentType.FLOAT, numVertices, BufferViewTarget.ARRAY_BUFFER);
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

export { occlusionVertex };
