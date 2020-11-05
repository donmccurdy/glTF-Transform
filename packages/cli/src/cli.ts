/* eslint-disable @typescript-eslint/no-var-requires */

import * as fs from 'fs';
import * as minimatch from 'minimatch';
import { gzip } from 'node-gzip';
import { program } from '@caporal/core';
import { Logger, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { AOOptions, CenterOptions, RotateOptions, DedupOptions, PartitionOptions, SequenceOptions, UnweldOptions, WeldOptions, ao, center, rotate, dedup, metalRough, partition, sequence, unweld, weld } from '@gltf-transform/lib';
import { inspect } from './inspect';
import { DracoCLIOptions, ETC1S_DEFAULTS, Filter, Mode, UASTC_DEFAULTS, draco, merge, toktx, unlit } from './transforms';
import { Session, formatBytes } from './util';
import { validate } from './validate';

// Use require() so microbundle doesn't compile this.
const draco3d = require('../vendor/draco3dgltf/draco3dgltf.js');

const io = new NodeIO()
	.registerExtensions(ALL_EXTENSIONS)
	.registerDependencies({
		'draco3d.decoder': draco3d.createDecoderModule(),
		'draco3d.encoder': draco3d.createEncoderModule(),
	});

const INPUT_DESC = 'Path to read glTF 2.0 (.glb, .gltf) model';
const OUTPUT_DESC = 'Path to write output';

program
	.version(require('../package.json').version)
	.description('Commandline interface for the glTF-Transform SDK.');

program.command('', '\n\n──────────────────── 🔎 INSPECT ─────────────────────');

// INSPECT
program
	.command('inspect', 'Inspect the contents of the model')
	.help('Inspect the contents of the model.')
	.argument('<input>', INPUT_DESC)
	.action(({args, logger}) => {
		inspect(io.readAsJSON(args.input as string), io, logger);
	});

// VALIDATE
program
	.command('validate', 'Validate the model against the glTF spec')
	.help('Validate the model with official glTF validator.')
	.argument('<input>', INPUT_DESC)
	.option('--limit <limit>', 'Limit number of issues to display', {
		validator: program.NUMBER,
		default: 1e7,
	})
	.option('--ignore <CODE>,<CODE>,...', 'Issue codes to be ignored', {
		validator: program.ARRAY,
		default: [],
	})
	.action(({args, options, logger}) => {
		validate(args.input as string, options, logger as unknown as Logger);
	});

program.command('', '\n\n──────────────────── 📦 PACKAGE ─────────────────────');

// COPY
program
	.command('copy', 'Copy the model with minimal changes')
	.alias('cp')
	.help('Copy the model with minimal changes.')
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.action(({args, logger}) => Session.create(io, logger, args.input, args.output).transform());

// MERGE
program
	.command('merge', 'Merge two or more models into one')
	.help(''
		+ 'Merge two or more models into one, each in a separate Scene.\n\n'
		+ 'Usage:\n\n'
		+ '  ▸ gltf-transform merge a.glb b.glb c.glb output.glb'
	)
	.argument('<path...>', 'Path to glTF 2.0 (.glb, .gltf) model(s). Final path is used to write output.')
	.option('--partition', 'Whether to maintain separate buffers for each input file. Invalid for GLB output.', {
		validator: program.BOOLEAN,
		default: false,
	})
	.action(({args, options, logger}) => {
		const paths = typeof args.path === 'string'
			? args.path.split(',')
			: args.path as string[];
		const output = paths.pop();
		return Session.create(io, logger, '', output)
			.transform(merge({io, paths, partition: !!options.partition}));
	});

// PARTITION
program
	.command('partition', 'Partition binary data into separate .bin files')
	.help('Partition binary data for meshes or animations into separate .bin files.')
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.option('--animations', 'Partition each animation into a separate .bin file', {
		validator: program.BOOLEAN,
		default: false,
	})
	.option('--meshes', 'Partition each mesh into a separate .bin file', {
		validator: program.BOOLEAN,
		default: false,
	})
	.action(({args, options, logger}) =>
		Session.create(io, logger, args.input, args.output)
			.transform(partition(options as PartitionOptions))
	);

// WELD
program
	.command('weld', 'Index geometry and optionally merge similar vertices')
	.help(`
Index geometry and optionally merge similar vertices. With --tolerance=0,
geometry is indexed in place, without merging.`.trim())
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.option('--tolerance', 'Per-attribute tolerance to merge similar vertices', {
		validator: program.NUMBER,
		default: 1e-4,
	})
	.action(({args, options, logger}) =>
		Session.create(io, logger, args.input, args.output)
			.transform(weld(options as unknown as WeldOptions))
	);

// UNWELD
program
	.command('unweld', 'De-index geometry, disconnecting any shared vertices')
	.help('De-index geometry, disconnecting any shared vertices.')
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.action(({args, options, logger}) =>
		Session.create(io, logger, args.input, args.output)
			.transform(unweld(options as unknown as UnweldOptions))
	);

program.command('', '\n\n───────────────────── ✨ STYLE ──────────────────────');

// AMBIENT OCCLUSION
program
	.command('ao', 'Bake per-vertex ambient occlusion')
	.help('Bake per-vertex ambient occlusion.')
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.option('--resolution <n>', 'AO resolution', {
		validator: program.NUMBER,
		default: 512,
	})
	.option('--samples <n>', 'Number of samples', {
		validator: program.NUMBER,
		default: 500,
	})
	.action(({args, options, logger}) =>
		Session.create(io, logger, args.input, args.output)
			.transform(ao({...options as unknown as AOOptions, gl: require('gl')}))
	);

// METALROUGH
program
	.command('metalrough', 'Convert materials from spec/gloss to metal/rough')
	.help('Convert materials from spec/gloss to metal/rough.')
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.action(({args, logger}) =>
		Session.create(io, logger, args.input, args.output)
			.transform(metalRough())
	);

// UNLIT
program
	.command('unlit', 'Convert materials from metal/rough to unlit')
	.help('Convert materials to an unlit, shadeless model.')
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.action(({args, logger}) =>
		Session.create(io, logger, args.input, args.output)
			.transform(unlit())
	);

// CENTER
program
	.command('center', 'Centers the scene at the origin, or above/below it')
	.help('Centers the scene at the origin, or above/below it.')
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.option('--pivot <pivot>', 'Method used to determine the scene pivot', {
		validator: ['center', 'above', 'below'],
		default: 'center',
	})
	.action(({args, options, logger}) =>
		Session.create(io, logger, args.input, args.output)
			.transform(center({...options} as CenterOptions))
	);

// ROTATE
program
	.command('rotate', 'Rotates the scene along euler angles')
	.help('Rotates the scene along euler angles.')
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.option('--yaw <yaw>', 'Yaw angle, rotation around base z axis', {
		validator: program.NUMBER,
		default: 0,
	})
	.option('--pitch <pitch>', 'Pitch angle, rotation around new x axis', {
		validator: program.NUMBER,
		default: 0,
	})
	.option('--roll <roll>', 'Roll angle, rotation around new z axis', {
		validator: program.NUMBER,
		default: 0,
	})
	.action(({args, options, logger}) => 
		Session.create(io, logger, args.input, args.output)
			.transform(rotate({euler: [options.yaw, options.pitch, options.roll]} as RotateOptions))
	);

// SEQUENCE
program
	.command('sequence', 'Animate nodes\' visibilities as a flipboard sequence')
	.help('Animate nodes\' visibilities as a flipboard sequence.')
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.option('--name <name>', 'Name of new animation', {
		validator: program.STRING,
		default: '',
	})
	.option('--pattern <pattern>', 'Pattern for node names (case-insensitive glob)', {
		validator: program.STRING,
		required: true,
	})
	.option('--fps <fps>', 'FPS (frames / second)', {
		validator: program.NUMBER,
		default: 10,
	})
	.option('--sort <sort>', 'Order sequence by node name', {
		validator: program.BOOLEAN,
		default: true,
	})
	.action(({args, options, logger}) => {
		const pattern = minimatch.makeRe(String(options.pattern), {nocase: true});
		return Session.create(io, logger, args.input, args.output)
			.transform(sequence({...options, pattern} as SequenceOptions));
	});

program.command('', '\n\n──────────────────── ⏩ OPTIMIZE ────────────────────');

// DEDUP
program
	.command('dedup', 'Deduplicate accessors and textures')
	.help('Deduplicate accessors and textures.')
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.option('--accessors <accessors>', 'Remove duplicate accessors', {
		validator: program.BOOLEAN,
		default: true,
	})
	.option('--textures <textures>', 'Remove duplicate textures', {
		validator: program.BOOLEAN,
		default: true,
	})
	.action(({args, options, logger}) =>
		Session.create(io, logger, args.input, args.output)
			.transform(dedup(options as unknown as DedupOptions))
	);

// DRACO
program
	.command('draco', 'Compress mesh geometry with Draco')
	.help(`
Compress mesh geometry with the Draco library. This type of compression affects
only geometry data — animation and textures are not compressed.

Two compression methods are available: 'edgebreaker' and 'sequential'. The
edgebreaker method will give higher compression in general, but changes the
order of the model's vertices. To preserve index order, use sequential
compression. When a mesh uses morph targets, or a high decoding speed is
selected, sequential compression will automatically be chosen.

Both speed options affect the encoder's choice of algorithms. For example, a
requirement for fast decoding may prevent the encoder from using the best
compression methods even if the encoding speed is set to 0. In general, the
faster of the two options limits the choice of features that can be used by the
encoder. Setting --decodeSpeed to be faster than the --encodeSpeed may allow the
encoder to choose the optimal method out of the available features for the
given --decodeSpeed.`.trim())
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.option('--method <method>', 'Compression method.', {
		validator: ['edgebreaker', 'sequential'],
		default: 'edgebreaker',
	})
	.option('--encodeSpeed <encodeSpeed>', 'Encoding speed vs. compression level, 1–10.', {
		validator: program.NUMBER,
		default: 5,
	})
	.option('--decodeSpeed <decodeSpeed>', 'Decoding speed vs. compression level, 1–10.', {
		validator: program.NUMBER,
		default: 5,
	})
	.option('--quantizePosition <bits>', 'Quantization bits for POSITION, 1-16.', {
		validator: program.NUMBER,
		default: 14,
	})
	.option('--quantizeNormal <bits>', 'Quantization bits for NORMAL, 1-16.', {
		validator: program.NUMBER,
		default: 10,
	})
	.option('--quantizeColor <bits>', 'Quantization bits for COLOR_*, 1-16.', {
		validator: program.NUMBER,
		default: 8,
	})
	.option('--quantizeTexcoord <bits>', 'Quantization bits for TEXCOORD_*, 1-16.', {
		validator: program.NUMBER,
		default: 12,
	})
	.option('--quantizeGeneric <bits>', 'Quantization bits for other attributes, 1-16.', {
		validator: program.NUMBER,
		default: 12,
	})
	.action(({args, options, logger}) =>
		// Include a lossless weld — Draco requires indices.
		Session.create(io, logger, args.input, args.output)
			.transform(weld({tolerance: 0}), draco(options as unknown as DracoCLIOptions))
	);

// GZIP
program
	.command('gzip', 'Compress the model with gzip')
	.help('Compress the model with gzip.')
	.argument('<input>', INPUT_DESC)
	.action(({args, logger}) => {
		const inBuffer = fs.readFileSync(args.input as string);
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
	.command('etc1s', 'Compress textures with KTX + Basis ETC1S')
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
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
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
		{validator: program.NUMBER, default: ETC1S_DEFAULTS.filterScale}
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
		{validator: program.NUMBER, default: ETC1S_DEFAULTS.quality}
	)
	.option(
		'--max-endpoints <max_endpoints>',
		'Manually set the maximum number of color endpoint clusters from'
		+ ' 1-16128.',
		{validator: program.NUMBER}
	)
	.option(
		'--max-selectors <max_selectors>',
		'Manually set the maximum number of color selector clusters from'
		+ ' 1-16128.',
		{validator: program.NUMBER}
	)
	.option(
		'--rdo-threshold <rdo_threshold>',
		'Set endpoint and selector RDO quality threshold. Lower'
		+ ' is higher quality but less quality per output bit (try 1.0-3.0).'
		+ ' Overrides --quality.',
		{validator: program.NUMBER}
	)
	.option(
		'--rdo-off',
		'Disable endpoint and selector RDO (slightly'
		+ ' faster, less noisy output, but lower quality per output bit).',
		{validator: program.BOOLEAN}
	)
	.action(({args, options, logger}) =>
		Session.create(io, logger, args.input, args.output)
			.transform(toktx({mode: Mode.ETC1S, ...options}))
	);

// UASTC
program
	.command('uastc', 'Compress textures with KTX + Basis UASTC')
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
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
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
		{validator: program.NUMBER, default: UASTC_DEFAULTS.filterScale}
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
		{validator: program.NUMBER, default: UASTC_DEFAULTS.rdoQuality}
	)
	.option(
		'--rdo-dictsize <uastc_rdo_d>',
		'Set UASTC RDO dictionary size in bytes. Default is 32768. Lower'
		+ ' values=faster, but give less compression. Possible range is 256'
		+ ' to 65536.',
		{validator: program.NUMBER, default: UASTC_DEFAULTS.rdoDictsize}
	)
	.option(
		'--zstd <compressionLevel>',
		'Supercompress the data with Zstandard.'
		+ ' Compression level range is 1 - 22, or 0 is uncompressed.'
		+ ' Lower values=faster but give less compression. Values above 20'
		+ ' should be used with caution as they require more memory.',
		{validator: program.NUMBER, default: 0}
	)
	.action(({args, options, logger}) =>
		Session.create(io, logger, args.input, args.output)
			.transform(toktx({mode: Mode.UASTC, ...options}))
	);

program.disableGlobalOption('--quiet');
program.disableGlobalOption('--no-color');

export { program };
export * from './util';
export * from './transforms';
