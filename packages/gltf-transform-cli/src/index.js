#!/usr/bin/env node

const fs = require('fs');
const gl = require('gl');
const path = require('path');
const program = require('caporal');
const { version } = require('../package.json');
const { GLTFUtil, NodeIO } = require('gltf-transform-util');
const { occlusionVertex } = require('gltf-transform-occlusion-vertex');

const io = new NodeIO(fs, path);

program
    .version(version);

// ANALYZE
program
    .command('analyze', 'Analyze a model\'s contents')
    .argument('<input>', 'Path to glTF 2.0 (.glb, .gltf) model')
    .action(({input}, options, logger) => {
        const container = io.read(input);
        const analysis = GLTFUtil.analyze(container);
        logger.info(JSON.stringify(analysis, null, 2));
    });

// AMBIENT OCCLUSION
program
    .command('ao', 'Bake per-vertex ambient occlusion')
    .argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) input')
    .argument('<output>', 'Path to write output')
    .option('--resolution <n>', 'AO resolution', program.INT, 512)
    .option('--samples <n>', 'Number of samples', program.INT, 500)
    .action(({input, output}, {resolution, samples}, logger) => {
        logger.info(`[ao] ${input} ${output} --resolution ${resolution} --samples ${samples}`);
        const container = io.read(input);
        occlusionVertex(container, {gl, resolution, samples});
        io.writeGLB(output, container);
        logger.info('[ao] Done.');
    });

    // .command('format <model>')
    // .description('TODO: Description.')
    // .option('-m, --mode [value]', 'Format ("binary", "separate", or "embedded"). Default is "binary".')
    // .action((file) => {
    //     console.error('[format] Not implemented.');
    // })

    // .command('atlas <model>')
    // .description('TODO: Description.')
    // .option('-s, --max-size <n>', 'Maximum texture size. Default is 2048.')
    // .action((file) => {
    //     console.error('[atlas] Not implemented.');
    // })

program
    .parse(process.argv);