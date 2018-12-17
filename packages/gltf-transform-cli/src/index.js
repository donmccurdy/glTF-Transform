#!/usr/bin/env node

const fs = require('fs');
const gl = require('gl');
const path = require('path');
const program = require('caporal');
const { version } = require('../package.json');
const { GLTFUtil, NodeIO } = require('gltf-transform-util');
const { occlusionVertex } = require('gltf-transform-occlusion-vertex');
const { split } = require('gltf-transform-split');

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
        const container = io.read(input);
        occlusionVertex(container, {gl, resolution, samples});
        io.writeGLB(output, container);
    });

// SPLIT
program
    .command('split', 'Split a model\'s binary data into separate files')
    .argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) input')
    .argument('<output>', 'Path to write output')
    .option('--meshes [meshes]', 'Mesh names.', program.LIST)
    .action(({input, output}, {meshes}) => {
        const container = io.read(input);
        split(container, meshes);
        io.writeGLTF(output, container);
    });

// PACK:TODO

// ATLAS:TODO

program
    .parse(process.argv);