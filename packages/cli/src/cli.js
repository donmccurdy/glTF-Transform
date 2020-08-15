#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const gl = require('gl');
const { gzip } = require('node-gzip');
const { program } = require('@caporal/core');
const { version } = require('../package.json');
const { Document, NodeIO } = require('@gltf-transform/core');
const { MaterialsUnlit, Unlit, KHRONOS_EXTENSIONS } = require('@gltf-transform/extensions');
const { ao, dedup, partition, metalRough } = require('@gltf-transform/lib');
const { inspect } = require('./inspect');
const { validate } = require('./validate');
const { formatBytes } = require('./util');
const { toktx, Filter, Mode, ETC1S_DEFAULTS, UASTC_DEFAULTS } = require('./toktx');

const io = new NodeIO(fs, path).registerExtensions(KHRONOS_EXTENSIONS);


program
	.version(version)
	.description('Commandline interface for the glTF-Transform SDK.');

/**********************************************************************************************
 * GENERAL
 */

// INSPECT
program
	.command('inspect', '🔎 Inspect the contents of the model')
	.help('Inspect the contents of the model.')
	.argument('<input>', 'Path to glTF 2.0 (.glb, .gltf) model')
	.action(({args, logger}) => {
		inspect(io.readNativeDocument(args.input), io, logger);
	});

// VALIDATE
program
	.command('validate', '🔎 Validate the model against the glTF spec')
	.help('Validate the model with official glTF validator.')
	.argument('<input>', 'Path to glTF 2.0 (.glb, .gltf) model')
	.option('--limit <limit>', 'Limit number of issues to display', {
		validator: program.NUMERIC,
		default: Infinity,
	})
	.option('--ignore <CODE>,<CODE>,...', 'Issue codes to be ignored', {
		validator: program.ARRAY,
		default: [],
	})
	.action(({args, options, logger}) => {
		validate(args.input, options, logger);
	});

// COPY
program
	.command('copy', '📦 Copy the model with minimal changes')
	.help('Copy the model with minimal changes.')
	.argument('<input>', 'Path to glTF 2.0 (.glb, .gltf) model')
	.argument('<output>', 'Path to write output')
	.action(({args, logger}) => {
		const doc = io.read(args.input).setLogger(logger);
		io.write(args.output, doc);
	});

// MERGE
program
	.command('merge', '📦 Merge two or more models into one')
	.help(''
		+ 'Merge two or more models into one, each in a separate Scene.\n\n'
		+ 'Usage:\n\n'
		+ '  ▸ gltf-transform merge a.glb b.glb c.glb output.glb'
	)
	.argument('<path...>', 'Path to glTF 2.0 (.glb, .gltf) model(s). Final path is used to write output.')
	.option('--partition', 'Whether to maintain separate buffers for each input file. Invalid for GLB output.', {
		validator: program.BOOL,
		default: false,
	})
	.action(({args, options, logger}) => {
		const doc = new Document().setLogger(logger);
		args.path.forEach((path, index) => {
			if (index < args.path.length - 1) {
				logger.debug(`Merging ${index + 1} / ${args.path.length - 1}, ${path}`)
				doc.merge(io.read(path));
			}
		});
		if (!options.partition) {
			const buffer = doc.getRoot().listBuffers()[0];
			doc.getRoot().listAccessors().forEach((a) => a.setBuffer(buffer));
			doc.getRoot().listBuffers().forEach((b, index) => index > 0 ? b.dispose() : null);
		}
		io.write(args.path.pop(), doc);
	});

// PARTITION
program
	.command('partition', '📦 Partition mesh data into separate .bin files')
	.help('Partition mesh data into separate .bin files.')
	.argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) input')
	.argument('<output>', 'Path to write output')
	.option('--meshes <meshes>', 'Mesh names', {
		validator: program.LIST,
		required: true,
	})
	.action(async ({args, options, logger}) => {
		const doc = await io.read(args.input)
			.setLogger(logger)
			.transform(partition(options));
		io.write(args.output, doc);
	});

/**********************************************************************************************
 * MODIFY
 */

// AMBIENT OCCLUSION
program
	.command('ao', '✨ Bake per-vertex ambient occlusion')
	.help('Bake per-vertex ambient occlusion.')
	.argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) input')
	.argument('<output>', 'Path to write output')
	.option('--resolution <n>', 'AO resolution', {
		validator: program.NUMERIC,
		default: 512,
	})
	.option('--samples <n>', 'Number of samples', {
		validator: program.NUMERIC,
		default: 500,
	})
	.action(async ({args, options, logger}) => {
		const doc = await io.read(args.input)
			.setLogger(logger)
			.transform(ao({...options, gl}));
		io.write(args.output, doc);
	});

// METALROUGH
program
	.command('metalrough', '✨ Convert materials from spec/gloss to metal/rough')
	.help('Convert materials from spec/gloss to metal/rough.')
	.argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) input')
	.argument('<output>', 'Path to write output')
	.action(async ({args, logger}) => {
		const doc = io.read(args.input).setLogger(logger);
		await metalRough({})(doc);
		io.write(args.output, doc);
	});

// UNLIT
program
	.command('unlit', '✨ Convert materials to an unlit model')
	.help('Convert materials to an unlit, shadeless model.')
	.argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) input')
	.argument('<output>', 'Path to write output')
	.action(({args, logger}) => {
		const doc = io.read(args.input).setLogger(logger);

		const unlitExtension = doc.createExtension(MaterialsUnlit);
		const unlit = unlitExtension.createUnlit();
		doc.getRoot().listMaterials().forEach((material) => {
			material.setExtension(Unlit, unlit);
		});

		io.write(args.output, doc);
	});

/**********************************************************************************************
 * OPTIMIZE
 */

// DEDUP
program
	.command('dedup', '⏩ Deduplicate accessors and textures')
	.help('Deduplicate accessors and textures.')
	.argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) input')
	.argument('<output>', 'Path to write output')
	.option('--accessors <accessors>', 'Remove duplicate accessors', {
		validator: program.BOOL,
		default: true,
	})
	.option('--textures <textures>', 'Remove duplicate textures', {
		validator: program.BOOL,
		default: true,
	})
	.action(async ({args, options, logger}) => {
		const doc = await io.read(args.input)
			.setLogger(logger)
			.transform(dedup(options));
		io.write(args.output, doc);
	});

// GZIP
program
	.command('gzip', '⏩ Compress the model with gzip')
	.help('Compress the model with gzip.')
	.argument('<input>', 'Path to glTF 2.0 (.glb, .gltf) model')
	.action(({args, logger}) => {
		const inBuffer = fs.readFileSync(args.input);
		return gzip(inBuffer)
			.then((outBuffer) => {
				const fileName = args.input + '.gz';
				const inSize = formatBytes(inBuffer.byteLength);
				const outSize = formatBytes(outBuffer.byteLength);
				fs.writeFileSync(fileName, outBuffer);
				logger.info(`Created ${fileName} (${inSize} → ${outSize})`);
			});
	});

const BASIS_SUMMARY = `
(EXPERIMENTAL) Compresses textures in the given file to .ktx2 GPU textures
using the {VARIANT} Basis Universal bitstream. GPU
textures offer faster GPU upload and less GPU memory consumption than
traditional PNG or JPEG textures, which are fully uncompressed in GPU memory.
GPU texture formats require more attention to compression settings to get
similar visual results.

{DETAILS}

Documentation:
https://gltf-transform.donmccurdy.com/extensions.html#khr_texture_basisu-experimental
`;

// ETC1S
program
	.command('etc1s', '⏩ Compress textures with KTX + Basis ETC1S')
	.help(
		BASIS_SUMMARY
			.replace('{VARIANT}', 'ETC1S (lower size, lower quality)')
			.replace('{DETAILS}', `
ETC1S, one of the two Basis Universal bitstreams, offers lower size
and lower quality than UASTC. In some cases it may be useful to
increase the resolution of the texture slightly, to minimize compression
artifacts while still retaining a smaller filesize. Details of this incomplete
glTF extension are still being worked out, particularly in regard to normal
maps. In the meantime, I recommend choosing less aggressive compression
settings for normal maps than for other texture types: you may want to use
UASTC for normal maps and ETC1S for other textures, for example.`.trim()),
		{sectionName: 'SUMMARY'}
	)
	.argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) input')
	.argument('<output>', 'Path to write output')
	.option(
		'--slots <slots>',
		'Texture slots to compress (glob expression)',
		{validator: program.STRING, default: '*'}
	)
	.option (
		'--filter <filter>',
		'Specifies the filter to use when generating mipmaps.',
		{validator: Object.values(Filter), default: ETC1S_DEFAULTS.filter}
	)
	.option (
		'--filter-scale <fscale>',
		'Specifies the filter scale to use when generating mipmaps.',
		{validator: program.NUMERIC, default: ETC1S_DEFAULTS.filterScale}
	)
	.option(
		'--compression <clevel>',
		'Compression level, an encoding speed vs. quality tradeoff.'
		+ ' Higher values are slower, but give higher quality. Try'
		+ ' --quality before experimenting with this option.',
		{validator: [0, 1, 2, 3, 4, 5], default: ETC1S_DEFAULTS.compression}
	)
	.option(
		'--quality <qlevel>',
		'Quality level. Range is 1 - 255. Lower gives better'
		+ ' compression, lower quality, and faster encoding. Higher gives less compression,'
		+ ' higher quality, and slower encoding. Quality level determines values of'
		+ ' --max_endpoints and --max-selectors, unless those values are explicitly set.',
		{validator: program.NUMERIC, default: ETC1S_DEFAULTS.quality}
	)
	.option(
		'--max-endpoints <max_endpoints>',
		'Manually set the maximum number of color endpoint clusters from'
		+ ' 1-16128.',
		{validator: program.NUMERIC}
	)
	.option(
		'--max-selectors <max_selectors>',
		'Manually set the maximum number of color selector clusters from'
		+ ' 1-16128.',
		{validator: program.NUMERIC}
	)
	.option(
		'--rdo-threshold <rdo_threshold>',
		'Set endpoint and selector RDO quality threshold. Lower'
		+ ' is higher quality but less quality per output bit (try 1.0-3.0).'
		+ ' Overrides --quality.',
		{validator: program.NUMERIC}
	)
	.option(
		'--rdo-off',
		'Disable endpoint and selector RDO (slightly'
		+ ' faster, less noisy output, but lower quality per output bit).',
		{validator: program.BOOL}
	)
	.action(async ({args, options, logger}) => {
		const doc = await io.read(args.input)
			.setLogger(logger)
			.transform(toktx({mode: Mode.ETC1S, ...options}));
		io.write(args.output, doc);
	});

// UASTC
program
	.command('uastc', '⏩ Compress textures with KTX + Basis UASTC')
	.help(
		BASIS_SUMMARY
			.replace('{VARIANT}', 'UASTC (higher size, higher quality)')
			.replace('{DETAILS}', `
UASTC, one of the two Basis Universal bitstreams, offers higher size and higher
quality than ETC1S. While it is suitable for all texture types, you may find it
useful to apply UASTC only where higher quality is necessary, and apply ETC1S for
textures where the quality is sufficient.`.trim()),
		{sectionName: 'SUMMARY'}
	)
	.argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) input')
	.argument('<output>', 'Path to write output')
	.option(
		'--slots <slots>',
		'Texture slots to compress (glob expression)',
		{validator: program.STRING, default: '*'}
	)
	.option (
		'--filter <filter>',
		'Specifies the filter to use when generating mipmaps.',
		{validator: Object.values(Filter), default: UASTC_DEFAULTS.filter}
	)
	.option (
		'--filter-scale <fscale>',
		'Specifies the filter scale to use when generating mipmaps.',
		{validator: program.NUMERIC, default: UASTC_DEFAULTS.filterScale}
	)
	.option(
		'--level <level>',
		'Create a texture in high-quality transcodable UASTC format.'
		+ ' The optional parameter <level> selects a speed'
		+ ' vs quality tradeoff as shown in the following table:'
		+ '\n\n'
		+ 'Level | Speed     | Quality'
		+ '\n——————|———————————|————————'
		+ '\n0     | Fastest   | 43.45dB'
		+ '\n1     | Faster    | 46.49dB'
		+ '\n2     | Default   | 47.47dB'
		+ '\n3     | Slower    | 48.01dB'
		+ '\n4     | Very slow | 48.24dB',
		{validator: [0, 1, 2, 3, 4], default: UASTC_DEFAULTS.level}
	)
	.option(
		'--rdo-quality <uastc_rdo_q>',
		'Enable UASTC RDO post-processing and optionally set UASTC RDO'
		+ ' quality scalar to <quality>.  Lower values yield higher'
		+ ' quality/larger LZ compressed files, higher values yield lower'
		+ ' quality/smaller LZ compressed files. A good range to try is [.2-4].'
		+ ' Full range is .001 to 10.0.',
		{validator: program.NUMERIC, default: UASTC_DEFAULTS.rdoQuality}
	)
	.option(
		'--rdo-dictsize <uastc_rdo_d>',
		'Set UASTC RDO dictionary size in bytes. Default is 32768. Lower'
		+ ' values=faster, but give less compression. Possible range is 256'
		+ ' to 65536.',
		{validator: program.NUMERIC, default: UASTC_DEFAULTS.rdoDictsize}
	)
	.option(
		'--zstd <compressionLevel>',
		'Supercompress the data with Zstandard.'
		+ ' Compression level range is 1 - 22, or 0 is uncompressed.'
		+ ' Lower values=faster but give less compression. Values above 20'
		+ ' should be used with caution as they require more memory.',
		{validator: program.NUMERIC, default: 0}
	)
	.action(async ({args, options, logger}) => {
		const doc = await io.read(args.input)
			.setLogger(logger)
			.transform(toktx({mode: Mode.UASTC, ...options}));
		io.write(args.output, doc);
	});

program.disableGlobalOption('--quiet');
program.disableGlobalOption('--no-color');

// Don't invoke run() in a test environment.
if (require.main === module) {
	program.disableGlobalOption('--silent');
	program.run();
}

module.exports = program;
