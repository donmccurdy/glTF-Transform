#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const util = require('util');
const gl = require('gl');
const program = require('caporal');
const { version } = require('../package.json');
const { NodeIO } = require('@gltf-transform/core');
const { MaterialsUnlit, Unlit, KHRONOS_EXTENSIONS } = require('@gltf-transform/extensions');
const { ao } = require('@gltf-transform/ao');
const { colorspace } = require('@gltf-transform/colorspace');
const { split } = require('@gltf-transform/split');
const { prune } = require('@gltf-transform/prune');
const { toktx, Mode, TOKTX_DEFAULTS } = require('./toktx');

const io = new NodeIO(fs, path).registerExtensions(KHRONOS_EXTENSIONS);

program
	.version(version);

// ANALYZE
program
	.command('analyze', 'Analyzes a model\'s contents')
	.argument('<input>', 'Path to glTF 2.0 (.glb, .gltf) model')
	.action(({input}, options, logger) => {
		const root = io.read(input).getRoot();
		const analysis = {
			accessors: root.listAccessors().length,
			buffers: root.listBuffers().length,
			materials: root.listMaterials().length,
			meshes: root.listMeshes().length,
			nodes: root.listNodes().length,
			textures: root.listTextures().length,
		};
		console.log(util.inspect(analysis, {colors: true, sorted: true}));
	});

// REPACK
program
	.command('repack', 'Rewrites the model with minimal changes')
	.argument('<input>', 'Path to glTF 2.0 (.glb, .gltf) model')
	.argument('<output>', 'Path to write output')
	.action(({input, output}, options, logger) => {
		const doc = io.read(input).setLogger(logger);
		io.write(output, doc);
	});

// AMBIENT OCCLUSION
program
	.command('ao', 'Bakes per-vertex ambient occlusion')
	.argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) input')
	.argument('<output>', 'Path to write output')
	.option('--resolution <n>', 'AO resolution', program.INT, 512)
	.option('--samples <n>', 'Number of samples', program.INT, 500)
	.action(({input, output}, {resolution, samples}, logger) => {
		const doc = io.read(input)
			.setLogger(logger)
			.transform(ao({gl, resolution, samples}));
		io.write(output, doc);
	});

// COLORSPACE
program
	.command('colorspace', 'Colorspace correction for vertex colors')
	.argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) input')
	.argument('<output>', 'Path to write output')
	.option('--inputEncoding [inputEncoding]', 'Input encoding for existing vertex colors', program.STRING)
	.action(({input, output}, {inputEncoding}, logger) => {
		const doc = io.read(input)
			.setLogger(logger)
			.transform(colorspace({inputEncoding}));
		io.write(output, doc);
	});

// PRUNE
program
	.command('prune', 'Prunes duplicate binary resources')
	.argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) input')
	.argument('<output>', 'Path to write output')
	.option('--accessors <accessors>', 'Prune duplicate accessors', program.BOOL, true, false)
	.option('--textures <textures>', 'Prune duplicate textures', program.BOOL, true, false)
	.action(({input, output}, {accessors, textures}, logger) => {
		const doc = io.read(input)
			.setLogger(logger)
			.transform(prune({accessors, textures}));
		io.write(output, doc);
	});

// SPLIT
program
	.command('split', 'Splits buffers so that separate meshes can be stored in separate .bin files')
	.argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) input')
	.argument('<output>', 'Path to write output')
	.option('--meshes <meshes>', 'Mesh names', program.LIST, [], true)
	.action(({input, output}, {meshes}, logger) => {
		const doc = io.read(input)
			.setLogger(logger)
			.transform(split({meshes}));
		io.write(output, doc);
	});

// KTX
program
	.command('ktx', 'Compresses textures with KTX + Basis Universal')
	.argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) input')
	.argument('<output>', 'Path to write output')
	.option(
		'--mode <mode>',
		'Basis Universal compression mode ["etc1s" = low quality, "uastc" = high quality]',
		[Mode.ETC1S, Mode.UASTC], Mode.ETC1S
	)
	.option(
		'--quality <quality>',
		'Quality level, where higher levels mean larger files [0 – 1]',
		program.FLOAT, TOKTX_DEFAULTS.quality
	)
	.option(
		'--zstd <zstd>',
		'ZSTD compression level (UASTC only) [1 – 20, 0 = Off]',
		program.FLOAT, 0
	)
	.option(
		'--slots <slots>',
		'Texture slots to compress (glob expression)',
		program.STRING, "*"
	)
	.action(({input, output}, options, logger) => {
		const doc = io.read(input)
			.setLogger(logger)
			.transform(toktx(options));
		io.write(output, doc);
	});

// UNLIT
program
	.command('unlit', 'Converts materials to an unlit, shadeless model')
	.argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) input')
	.argument('<output>', 'Path to write output')
	.action(({input, output}, _, logger) => {
		const doc = io.read(input).setLogger(logger);

		const unlitExtension = doc.createExtension(MaterialsUnlit);
		const unlit = unlitExtension.createUnlit();
		doc.getRoot().listMaterials().forEach((material) => {
			material.setExtension(Unlit, unlit);
		});

		io.write(output, doc);
	});

// CHAIN
// program
// 	.command('chain', 'Chains together multiple commands in sequence')
// 	.argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) input')
// 	.argument('<output>', 'Path to write output')
// 	.option('--transforms <transforms>', 'Transforms to apply, as comma-separated strings: "split [options]","..."', program.LIST, [], true)
// 	.action(({input, output}, {transforms}, logger) => {
// 		const doc = io.read(input)
// 			.setLogger(logger);
// 		logger.info(input, output, transforms);
// 		io.write(output, doc);
// 	});

program
	.parse(process.argv);
