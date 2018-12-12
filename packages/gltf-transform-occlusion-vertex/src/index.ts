import { GLTFContainer, GLTFUtil, LoggerVerbosity } from 'gltf-transform-util';
import * as geoaoNamespace from 'geo-ambient-occlusion';

const geoao = geoaoNamespace as Function;
const logger = GLTFUtil.createLogger('gltf-transform-occlusion-vertex', LoggerVerbosity.INFO);

interface IOcclusionOptions {
    resolution: 512;
    samples: 500;
}

function getTextureBuffer (): ArrayBuffer {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    const grd = ctx.createLinearGradient(0, 0, 255, 0);
    grd.addColorStop(0, '#000');
    grd.addColorStop(1, '#fff');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 256, 1);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return imgData.data.buffer;
}

let aoTextureBuffer;

function occlusionVertex (container: GLTFContainer, options: IOcclusionOptions): GLTFContainer {

    aoTextureBuffer = aoTextureBuffer || getTextureBuffer();
    const {resolution, samples} = options;
    logger.info(`Resolution: ${resolution}; Samples: ${samples}`);

    const primitives = [];
    const meshes = container.json.meshes || [];
    meshes.forEach((mesh) => {
        mesh.primitives.forEach((primitive) => {
            const position = container.getAccessorArray(primitive.attributes['POSITION']);
            const cells = primitive.indices !== undefined ? container.getAccessorArray(primitive.indices) : undefined;
            primitives.push({position, cells});
        })
    });    

    if (primitives.length === 0) {
        logger.warn('No primitives found.');
        return;
    }

    container.addImage('occlusion.png', aoTextureBuffer, GLTF.ImageMimeType.PNG);
    container.json.textures.push({source: container.json.images.length - 1});
    const occlusionTextureIndex = container.json.textures.length - 1;
    
    // TODO: Implement baking such that primitives affect other primitives, and respect
    // world transforms.
    primitives.forEach((primitive, index) => {
        logger.info(`Baking primitive ${index} / ${primitives.length}.`);

        if (container.json.materials[primitive.material].occlusionTexture) {
            // TODO: Duplicate the material if needed.
            logger.error(`Primitive "${primitive.name}" material already has AO map, and may be shared by another primitive. Skipping.`);
            return;
        }

        // Bake vertex AO.
        const {position, cells} = primitive;
        const aoSampler = geoao(position, {cells, resolution});
        for (let i = 0; i < samples; i++) aoSampler.sample();
        const ao = aoSampler.report();
        aoSampler.dispose();

        // Write UV set and add AO map.
        const numVertices = ao.length;
        const uv2Data = new Float32Array(numVertices * 2);
        for (let i = 0; i < numVertices; i++) {
            uv2Data[i * 2] = uv2Data[i * 2 + 1] = 1 - ao[i];
        }
        container.addAccessor(uv2Data, GLTF.AccessorType.VEC2, 12345);
        primitive.attributes['TEXCOORD_1'] = container.json.accessors.length - 1;
        if (primitive.attributes['TEXCOORD_0'] === undefined) {
            primitive.attributes['TEXCOORD_0'] = container.json.accessors.length - 1;
        }
        container.json.materials[primitive.material].occlusionTexture = {index: occlusionTextureIndex};
    });

    logger.info('Finished baking per-vertex occlusion.');
    return container;
}

export { occlusionVertex };
