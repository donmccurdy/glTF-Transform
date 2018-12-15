#!/usr/bin/env node

const fs = require('fs');
const gl = require('gl');
const path = require('path');
const program = require('caporal');
const { version } = require('../package.json');
const { GLTFUtil } = require('gltf-transform-util');
const { occlusionVertex } = require('gltf-transform-occlusion-vertex');

const readGLB = (filepath) => {
    const glbBuffer = fs.readFileSync(filepath);
    // Byte offset may be non-zero.
    const {byteOffset, byteLength} = glbBuffer;
    const glb = glbBuffer.buffer.slice(byteOffset, byteOffset + byteLength);
    return GLTFUtil.wrapGLB(glb);
};

const writeGLTF = (filepath, container) => {
    const {json, resources} = GLTFUtil.bundleGLTF(container);
    fs.writeFileSync(filepath, JSON.stringify(json, null, 2));
    const dir = path.dirname(filepath);
    Object.keys(resources).forEach((resourcePath) => {
        const resource = resources[resourcePath];
        fs.writeFileSync(path.join(dir, resourcePath), new Buffer(resource));
    });
};

program
    .version(version)

program
    .command('analyze', 'Analyze a model\'s contents')
    .argument('<input>', 'Path to glTF 2.0 (.glb, .gltf) model')
    .action(({input}, options, logger) => {
        const container = readGLB(input);
        const analysis = GLTFUtil.analyze(container);
        logger.info(JSON.stringify(analysis, null, 2));
    });

// program.command('format <model>')
//     .description('TODO: Description.')
//     .option('-m, --mode [value]', 'Format ("binary", "separate", or "embedded"). Default is "binary".')
//     .action((file) => {
//         console.error('[format] Not implemented.');
//     });

// program.command('atlas <model>')
//     .description('TODO: Description.')
//     .option('-s, --max-size <n>', 'Maximum texture size. Default is 2048.')
//     .action((file) => {
//         console.error('[atlas] Not implemented.');
//     });

program.command('ao', 'Bake per-vertex ambient occlusion')
    .argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) input')
    .argument('<output>', 'Path to write output')
    .option('--resolution <n>', 'AO resolution', program.INT, 512)
    .option('--samples <n>', 'Number of samples', program.INT, 500)
    .action(({input, output}, {resolution, samples}, logger) => {
        logger.info(`[ao] ${input} ${output} --resolution ${resolution} --samples ${samples}`);
        const container = readGLB(input);
        occlusionVertex(container, {gl, resolution, samples});
        writeGLTF(output, container);
        logger.info('[ao] Done.');
    });

program.parse(process.argv);