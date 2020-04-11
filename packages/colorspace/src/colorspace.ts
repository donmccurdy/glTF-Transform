import { GLTFContainer, GLTFUtil, LoggerVerbosity, AccessorTypeData } from '@gltf-transform/core';

const logger = GLTFUtil.createLogger('@gltf-transform/colorspace', LoggerVerbosity.INFO);

interface IColorspaceOptions {
    inputEncoding: string;
}

function colorspace (container: GLTFContainer, options: IColorspaceOptions): GLTFContainer {

    if (options.inputEncoding === 'linear') {
        logger.info(`Vertex colors already linear. Skipping conversion.`);
        return container;
    }

    if (options.inputEncoding !== 'sRGB') {
        logger.error(`Unknown input encoding "${options.inputEncoding}" – should be "sRGB" or "linear". Skipping conversion.`);
        return container;
    }

    const converted = new Set();

    container.json.meshes.forEach((mesh) => {
        mesh.primitives.forEach((primitive) => {
            for (let i = 0; primitive.attributes[`COLOR_${i}`] !== undefined; i++) {

                const accessorIndex = primitive.attributes[`COLOR_${i}`];
                if (converted.has(accessorIndex)) continue;

                const accessorDef = container.json.accessors[accessorIndex];
                const accessorData = container.getAccessorArray(accessorIndex);
                const valueSize = AccessorTypeData[accessorDef.type].size;

                if (accessorDef.min) {
                    accessorDef.min[0] = accessorDef.min[1] = accessorDef.min[2] = Infinity;
                }
                if (accessorDef.max) {
                    accessorDef.max[0] = accessorDef.max[1] = accessorDef.max[2] = -Infinity;
                }

                for (let j = 0; j < accessorData.length; j += valueSize) {
                    accessorData[j + 0] = SRGBToLinear(accessorData[j + 0]);
                    accessorData[j + 1] = SRGBToLinear(accessorData[j + 1]);
                    accessorData[j + 2] = SRGBToLinear(accessorData[j + 2]);

                    if (accessorDef.min) {
                        accessorDef.min[0] = Math.min(accessorData[j + 0], accessorDef.min[0]);
                        accessorDef.min[1] = Math.min(accessorData[j + 1], accessorDef.min[1]);
                        accessorDef.min[2] = Math.min(accessorData[j + 2], accessorDef.min[2]);
                    }

                    if (accessorDef.max) {
                        accessorDef.max[0] = Math.max(accessorData[j + 0], accessorDef.max[0]);
                        accessorDef.max[1] = Math.max(accessorData[j + 1], accessorDef.max[1]);
                        accessorDef.max[2] = Math.max(accessorData[j + 2], accessorDef.max[2]);
                    }
                }

                converted.add(accessorIndex);
            }
        });
    });

    logger.info(`Corrected vertex colors from ${options.inputEncoding} to linear.`);

    return container;

}

// Source: THREE.Color
function SRGBToLinear( c ) {

    return ( c < 0.04045 ) ? c * 0.0773993808 : Math.pow( c * 0.9478672986 + 0.0521327014, 2.4 );

}

export { colorspace };
