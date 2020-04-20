#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const gl = require('gl');
const { createCanvas, Image } = require('canvas');
const program = require('caporal');
const { version } = require('../package.json');
const { NodeIO } = require('@gltf-transform/core');
const { ao } = require('@gltf-transform/ao');
// const { atlas } = require('@gltf-transform/atlas');
const { colorspace } = require('@gltf-transform/colorspace');
const { split } = require('@gltf-transform/split');
const { prune } = require('@gltf-transform/prune');

const io = new NodeIO(fs, path);

program
    .version(version);

// ANALYZE
program
    .command('analyze', 'Analyzes a model\'s contents')
    .argument('<input>', 'Path to glTF 2.0 (.glb, .gltf) model')
    .action(({input}, options, logger) => {
		const container = io.read(input);
		const root = container.getRoot();
        const analysis = {
			nodes: root.listNodes().length,
			meshes: root.listMeshes().length,
			materials: root.listMaterials().length,
			textures: root.listTextures().length,
			accessors: root.listAccessors().length,
			buffers: root.listBuffers().length,
		};
        logger.info(JSON.stringify(analysis, null, 2));
	});

// REPACK
program
    .command('repack', 'Rewrites the model with minimal changes')
	.argument('<input>', 'Path to glTF 2.0 (.glb, .gltf) model')
	.argument('<output>', 'Path to write output')
    .action(({input, output}, options, logger) => {
		const container = io.read(input);
		io.write(output, container);
    });

// AMBIENT OCCLUSION
program
    .command('ao', 'Bakes per-vertex ambient occlusion')
    .argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) input')
    .argument('<output>', 'Path to write output')
    .option('--resolution <n>', 'AO resolution', program.INT, 512)
    .option('--samples <n>', 'Number of samples', program.INT, 500)
    .action(({input, output}, {resolution, samples}, logger) => {
        const container = io.read(input);
        ao(container, {gl, resolution, samples});
        io.write(output, container);
    });

// ATLAS
// program
//     .command('atlas', 'Creates a texture atlas with simple rectangular packing')
//     .argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) input')
//     .argument('<output>', 'Path to write output')
//     .option('--size [size]', 'Atlas size', program.INT)
//     .option('--bake [bakeUVs]', 'If set, bakes transformed UVs to meshes. '
//         + 'Otherwise, adds UV transforms to each material.', program.BOOL)
//     .action(({input, output}, {size, bake}, logger) => {
//         const container = io.read(input);
//         atlas(container, {size, bake, createCanvas, createImage: () => new Image()}).then(() => {
//             io.write(output, container);
//         }).catch((e) => {
//             logger.error(e);
//         });
//     });

// COLORSPACE
program
    .command('colorspace', 'Colorspace correction for vertex colors')
    .argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) input')
    .argument('<output>', 'Path to write output')
    .option('--inputEncoding [inputEncoding]', 'Input encoding for existing vertex colors', program.STRING)
    .action(({input, output}, {inputEncoding}, logger) => {
        const container = io.read(input);
        colorspace(container, {inputEncoding});
        io.write(output, container);
    });

// PRUNE
program
    .command('prune', 'Prunes duplicate accessors')
    .argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) input')
    .argument('<output>', 'Path to write output')
    .action(({input, output}, {meshes}) => {
        const container = io.read(input);
        prune(container, meshes);
        io.write(output, container);
    });

// SPLIT
program
    .command('split', 'Splits buffers so that separate meshes can be stored in separate .bin files')
    .argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) input')
    .argument('<output>', 'Path to write output')
    .option('--meshes [meshes]', 'Mesh names', program.LIST)
    .action(({input, output}, {meshes}) => {
        const container = io.read(input);
        split(container, meshes);
        io.write(output, container);
    });

program
    .parse(process.argv);
