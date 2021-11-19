/* eslint-disable @typescript-eslint/no-var-requires */

import fs from 'fs';
import minimatch from 'minimatch';
import { gzip } from 'node-gzip';
import { program } from '@caporal/core';
import { Logger, NodeIO, PropertyType, VertexLayout, vec2 } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { CenterOptions, InstanceOptions, PartitionOptions, PruneOptions, QUANTIZE_DEFAULTS, ResampleOptions, SequenceOptions, TEXTURE_RESIZE_DEFAULTS, TextureResizeFilter, UnweldOptions, WeldOptions, center, dedup, instance, metalRough, partition, prune, quantize, resample, sequence, tangents, textureResize, unweld, weld, reorder, dequantize } from '@gltf-transform/functions';
import { InspectFormat, inspect } from './inspect';
import { DRACO_DEFAULTS, DracoCLIOptions, ETC1S_DEFAULTS, Filter, Mode, UASTC_DEFAULTS, draco, ktxfix, merge, toktx, unlit, meshopt, MeshoptCLIOptions } from './transforms';
import { Session, formatBytes } from './util';
import { ValidateOptions, validate } from './validate';

let io: NodeIO;

// Use require() so microbundle doesn't compile these.
const draco3d = require('draco3dgltf');
const mikktspace = require('mikktspace');
const { MeshoptDecoder, MeshoptEncoder } = require('meshoptimizer');

const programReady = new Promise<void>((resolve) => {
	Promise.all([
		draco3d.createDecoderModule(),
		draco3d.createEncoderModule(),
		MeshoptDecoder.ready,
		MeshoptEncoder.ready,
	]).then(([decoder, encoder, _]) => {
		io = new NodeIO()
			.registerExtensions(ALL_EXTENSIONS)
			.registerDependencies({
				'draco3d.decoder': decoder,
				'draco3d.encoder': encoder,
				'meshopt.decoder': MeshoptDecoder,
				'meshopt.encoder': MeshoptEncoder,
			});
		resolve();
	});
});

const INPUT_DESC = 'Path to read glTF 2.0 (.glb, .gltf) model';
const OUTPUT_DESC = 'Path to write output';

program
	.version(require('../package.json').version)
	.description('Commandline interface for the glTF-Transform SDK.');

program.command('', '\n\n🔎 INSPECT ──────────────────────────────────────────');

// INSPECT
program
	.command('inspect', 'Inspect the contents of the model')
	.help(`
Inspect the contents of the model, printing a table with properties and
statistics for scenes, meshes, materials, textures, and animations contained
by the file. This data is useful for understanding how much of a file's size
is comprised of geometry vs. textures, which extensions are needed when loading
the file, and which material properties are being used.

Use --format=csv or --format=md for alternative display formats.
	`.trim())
	.argument('<input>', INPUT_DESC)
	.option('--format <format>', 'Table output format', {
		validator: [InspectFormat.PRETTY, InspectFormat.CSV, InspectFormat.MD],
		default: InspectFormat.PRETTY
	})
	.action(async ({args, options, logger}) => {
		io.setLogger(logger as unknown as Logger);
		await inspect(
			io.readAsJSON(args.input as string),
			io,
			logger as unknown as Logger,
			options.format as InspectFormat
		);
	});

// VALIDATE
program
	.command('validate', 'Validate the model against the glTF spec')
	.help(`
Validate the model with official glTF validator. The validator detects whether
a file conforms correctly to the glTF specification, and is useful for
debugging issues with a model. Validation errors typically suggest a problem
in the authoring process, and can be reported as bugs on the software used to
export the file. Certain lower-priority issues are not technically invalid, but
may indicate an unintended situation in the file, like unused data not attached
to any particular scene.

For more details about the official validation suite used here, see:
https://github.com/KhronosGroup/glTF-Validator

Example:

  ▸ gltf-transform validate input.glb --ignore ACCESSOR_WEIGHTS_NON_NORMALIZED
	`.trim())
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
		validate(
			args.input as string,
			options as unknown as ValidateOptions,
			logger as unknown as Logger
		);
	});

program.command('', '\n\n📦 PACKAGE ──────────────────────────────────────────');

// COPY
program
	.command('copy', 'Copy the model with minimal changes')
	.alias('cp')
	.help(`
Copy the model from <input> to <output> with minimal changes. Unlike filesystem
\`cp\`, this command does parse the file into glTF-Transform's internal
representation before serializing it to disk again. No other intentional
changes are made, so copying a model can be a useful first step to confirm that
glTF-Transform is reading and writing the model correctly when debugging issues
in a larger script doing more complex processing of the file. Copying may also
be used to ensure consistent data layout across glTF files from different
exporters, e.g. if your engine always requires interleaved vertex attributes.

While vertex data remains byte-for-byte the same before and after copying, and
scene, node, material, and other properties are also preserved losslessly,
certain aspects of data layout may change slightly with this process:

- Vertex attributes within a mesh are interleaved.
- Accessors are organized into buffer views according to usage.
- Draco compression is removed to avoid a lossy decompress/compress round trip.
`.trim())
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.action(({args, logger}) => Session.create(io, logger, args.input, args.output).transform());

// MERGE
program
	.command('merge', 'Merge two or more models into one')
	.help(`
Merge two or more models into one, each in a separate Scene. Optionally, the
binary data for each model may be kept in a separate buffer with the
--partition flag.

Example:

  ▸ gltf-transform merge a.glb b.glb c.glb output.glb
	`.trim())
	.argument('<path...>', `${INPUT_DESC}(s). Final path is used to write output.`)
	.option(
		'--partition',
		'Whether to keep separate buffers for each input file. Invalid for GLB output.',
		{
			validator: program.BOOLEAN,
			default: false,
		}
	)
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
	.help(`
Partition binary data for meshes or animations into separate .bin files. In
engines that support lazy-loading resources within glTF files, this allows
restructuring the data to minimize initial load time, fetching additional
resources as needed. Partitioning is supported only for .gltf, not .glb, files.
	`.trim())
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

// DEDUP
program
	.command('dedup', 'Deduplicate accessors and textures')
	.help(`
Deduplicate accessors, textures, materials, and meshes. Some exporters or
pipeline processing may lead to multiple resources within a file containing
redundant copies of the same information. This functions scans for these cases
and merges the duplicates where possible, reducing file size. The process may
be very slow on large files with many accessors.

Deduplication early in a pipeline may also help other optimizations, like
compression and instancing, to be more effective.
	`.trim())
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.option('--accessors <accessors>', 'Remove duplicate accessors', {
		validator: program.BOOLEAN,
		default: true,
	})
	.option('--materials <materials>', 'Remove duplicate materials', {
		validator: program.BOOLEAN,
		default: true,
	})
	.option('--meshes <meshes>', 'Remove duplicate meshes', {
		validator: program.BOOLEAN,
		default: true,
	})
	.option('--textures <textures>', 'Remove duplicate textures', {
		validator: program.BOOLEAN,
		default: true,
	})
	.action(({args, options, logger}) => {
		const propertyTypes: string[] = [];
		if (options.accessors) propertyTypes.push(PropertyType.ACCESSOR);
		if (options.materials) propertyTypes.push(PropertyType.MATERIAL);
		if (options.meshes) propertyTypes.push(PropertyType.MESH);
		if (options.textures) propertyTypes.push(PropertyType.TEXTURE);
		return Session.create(io, logger, args.input, args.output)
			.transform(dedup({propertyTypes}));
	}

	);

// PRUNE
program
	.command('prune', 'Remove unreferenced properties from the file')
	.help(`
Removes properties from the file if they are not referenced by a Scene. Helpful
when cleaning up after complex workflows or a faulty exporter. This function
may (conservatively) fail to identify some unused extension properties, such as
lights, but it will not remove anything that is still in use, even if used by
an extension. Animations are considered unused if they do not target any nodes
that are children of a scene.
	`.trim())
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.action(({args, options, logger}) =>
		Session.create(io, logger, args.input, args.output)
			.transform(prune(options as unknown as PruneOptions))
	);

// GZIP
program
	.command('gzip', 'Compress the model with lossless gzip')
	.help(`
Compress the model with gzip. Gzip is a general-purpose file compression
technique, not specific to glTF models. On the web, decompression is
handled automatically by the web browser, without any intervention from the
client application.

When the model contains resources that are already effectively compressed, like
JPEG textures or Draco geometry, gzip is unlikely to add much further benefit
and can be skipped. Other compression strategies, like Meshopt and quantization,
work best when combined with gzip.
`)
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

program.command('', '\n\n🌍 SCENE ────────────────────────────────────────────');

// CENTER
program
	.command('center', 'Center the scene at the origin, or above/below it')
	.help(`
Center the scene at the origin, or above/below it. When loading a model into
a larger scene, or into an augmented reality context, it's often best to ensure
the model's pivot is centered beneath the object. For objects meant to be
attached a surface, like a ceiling fan, the pivot may be located above instead.
	`.trim())
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

// INSTANCE
program
	.command('instance', 'Create GPU instances from shared Mesh references')
	.help(`
For meshes reused by more than one node in a scene, this command creates an
EXT_mesh_gpu_instancing extension to aid with GPU instancing. In engines that
support the extension, this may allow GPU instancing to be used, reducing draw
calls and improving framerate.

Engines may use GPU instancing with or without the presence of this extension,
and are strongly encouraged to do so. However, particularly when loading a
model at runtime, the extension provides useful context allowing the engine to
use this technique efficiently.

Instanced meshes cannot be animated, and must share the same materials. For
further details, see:

https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_mesh_gpu_instancing.
	`.trim())
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.action(({args, options, logger}) =>
		Session.create(io, logger, args.input, args.output)
			.transform(instance({...options} as InstanceOptions))
	);

program.command('', '\n\n🕋 GEOMETRY ─────────────────────────────────────────');

// DRACO
program
	.command('draco', 'Compress geometry with Draco')
	.help(`
Compress mesh geometry with the Draco library. This type of compression affects
only geometry data — animation and textures are not compressed.

Compresses
- geometry (only triangle meshes)

Documentation
- https://gltf-transform.donmccurdy.com/classes/extensions.dracomeshcompression.html

References
- draco: https://github.com/google/draco
- KHR_draco_mesh_compression: https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_draco_mesh_compression/
`.trim())
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.option('--method <method>', 'Compression method.', {
		validator: ['edgebreaker', 'sequential'],
		default: 'edgebreaker',
	})
	.option('--encode-speed <encodeSpeed>', 'Encoding speed vs. compression level, 1–10.', {
		validator: program.NUMBER,
		default: DRACO_DEFAULTS.encodeSpeed,
	})
	.option('--decode-speed <decodeSpeed>', 'Decoding speed vs. compression level, 1–10.', {
		validator: program.NUMBER,
		default: DRACO_DEFAULTS.decodeSpeed,
	})
	.option('--quantize-position <bits>', 'Quantization bits for POSITION, 1-16.', {
		validator: program.NUMBER,
		default: DRACO_DEFAULTS.quantizePosition,
	})
	.option('--quantize-normal <bits>', 'Quantization bits for NORMAL, 1-16.', {
		validator: program.NUMBER,
		default: DRACO_DEFAULTS.quantizeNormal,
	})
	.option('--quantize-color <bits>', 'Quantization bits for COLOR_*, 1-16.', {
		validator: program.NUMBER,
		default: DRACO_DEFAULTS.quantizeColor,
	})
	.option('--quantize-texcoord <bits>', 'Quantization bits for TEXCOORD_*, 1-16.', {
		validator: program.NUMBER,
		default: DRACO_DEFAULTS.quantizeTexcoord,
	})
	.option('--quantize-generic <bits>', 'Quantization bits for other attributes, 1-16.', {
		validator: program.NUMBER,
		default: DRACO_DEFAULTS.quantizeGeneric,
	})
	.option('--quantization-volume <volume>', 'Bounds for quantization grid.', {
		validator: ['mesh', 'scene'],
		default: DRACO_DEFAULTS.quantizationVolume,
	})
	.action(({args, options, logger}) =>
		// Include a lossless weld — Draco requires indices.
		Session.create(io, logger, args.input, args.output)
			.transform(weld({tolerance: 0}), draco(options as unknown as DracoCLIOptions))
	);

// MESHOPT
program
	.command('meshopt', 'Compress geometry and animation with Meshopt')
	.help(`
Compress geometry, morph targets, and animation with Meshopt. Meshopt
compression decodes very quickly, and is best used in combination with a
lossless compression method like brotli or gzip.

Compresses
- geometry (points, lines, triangle meshes)
- morph targets
- animation tracks

Documentation
- https://gltf-transform.donmccurdy.com/classes/extensions.meshoptcompression.html

References
- meshoptimizer: https://github.com/zeux/meshoptimizer
- EXT_meshopt_compression: https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Vendor/EXT_meshopt_compression/
`.trim())
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.option('--level <level>', 'Compression level.', {
		validator: ['medium', 'high'],
		default: 'high'
	})
	.action(({args, options, logger}) =>
		Session.create(io, logger, args.input, args.output)
				.transform(meshopt(options as unknown as MeshoptCLIOptions))
	);

// QUANTIZE
program
	.command('quantize', 'Quantize geometry, reducing precision and memory')
	.help(`
Quantization is a simple type of compression taking 32-bit float vertex
attributes and storing them as 16-bit or 8-bit integers. A quantization factor
restoring the original value (with some error) is applied on the GPU, although
node scales and positions may also be changed to account for the quantization.

Quantized vertex attributes require less space, both on disk and on the GPU.
Most vertex attribute types can be quantized from 8–16 bits, but are always
stored in 8- or 16-bit accessors. While a value quantized to 12 bits still
occupies 16 bits on disk, gzip (or other lossless compression) will be more
effective on values quantized to lower bit depths. As a result, the default
bit depths used by this command are generally between 8 and 16 bits.

Bit depths for indices and JOINTS_* are determined automatically.

Requires KHR_mesh_quantization support.`.trim())
	.argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) input')
	.argument('<output>', 'Path to write output')
	.option('--pattern <pattern>', 'Pattern for vertex attributes (case-insensitive glob)', {
		validator: program.STRING,
		default: '*',
	})
	.option('--quantize-position <bits>', 'Precision for POSITION attributes.', {
		validator: program.NUMBER,
		default: QUANTIZE_DEFAULTS.quantizePosition,
	})
	.option('--quantize-normal <bits>', 'Precision for NORMAL and TANGENT attributes.', {
		validator: program.NUMBER,
		default: QUANTIZE_DEFAULTS.quantizeNormal,
	})
	.option('--quantize-texcoord <bits>', 'Precision for TEXCOORD_* attributes.', {
		validator: program.NUMBER,
		default: QUANTIZE_DEFAULTS.quantizeTexcoord,
	})
	.option('--quantize-color <bits>', 'Precision for COLOR_* attributes.', {
		validator: program.NUMBER,
		default: QUANTIZE_DEFAULTS.quantizeColor,
	})
	.option('--quantize-weight <bits>', 'Precision for WEIGHTS_* attributes.', {
		validator: program.NUMBER,
		default: QUANTIZE_DEFAULTS.quantizeWeight,
	})
	.option('--quantize-generic <bits>', 'Precision for custom (_*) attributes.', {
		validator: program.NUMBER,
		default: QUANTIZE_DEFAULTS.quantizeGeneric,
	})
	.option('--quantization-volume <volume>', 'Bounds for quantization grid.', {
		validator: ['mesh', 'scene'],
		default: QUANTIZE_DEFAULTS.quantizationVolume,
	})
	.action(({args, options, logger}) => {
		const pattern = minimatch.makeRe(String(options.pattern), {nocase: true});
		return Session.create(io, logger, args.input, args.output)
			.transform(quantize({...options, pattern}));
	});

// DEQUANTIZE
program
	.command('dequantize', 'Dequantize geometry')
	.help(`
Removes quantization from an asset. This will increase the size of the asset on
disk and in memory, but may be necessary for applications that don't support
quantization.

Removes KHR_mesh_quantization, if present.`.trim())
	.argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) input')
	.argument('<output>', 'Path to write output')
	.option('--pattern <pattern>', 'Pattern for vertex attributes (case-insensitive glob)', {
		validator: program.STRING,
		default: '!JOINTS_*',
	})
	.action(({args, options, logger}) => {
		const pattern = minimatch.makeRe(String(options.pattern), {nocase: true});
		return Session.create(io, logger, args.input, args.output)
			.transform(dequantize({...options, pattern}));
	});

// WELD
program
	.command('weld', 'Index geometry and optionally merge similar vertices')
	.help(`
Index geometry and optionally merge similar vertices. When merged and indexed,
data is shared more efficiently between vertices. File size can be reduced, and
the GPU can sometimes use the vertex cache more efficiently. With --tolerance=0,
geometry is indexed in place, without merging.
	`.trim())
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
	.help(`
De-index geometry, disconnecting any shared vertices. This tends to increase
the file size of the geometry and decrease efficiency, and so is not
recommended unless disconnected vertices ("vertex soup") are required for some
paricular software application.
	`.trim())
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.action(({args, options, logger}) =>
		Session.create(io, logger, args.input, args.output)
			.transform(unweld(options as unknown as UnweldOptions))
	);

// TANGENTS
program
	.command('tangents', 'Generate MikkTSpace vertex tangents')
	.help(`
Generates MikkTSpace vertex tangents.

In some situations normal maps may appear incorrectly, displaying hard edges
at seams, or unexpectedly inverted insets and extrusions. The issue is most
commonly caused by a mismatch between the software used to bake the normal map
and the pixel shader or other code used to render it. While this may be a
frustration to an artist/designer, it is not always possible for the rendering
engine to reconstruct the tangent space used by the authoring software.

Most normal map bakers use the MikkTSpace standard (http://www.mikktspace.com/)
to generate vertex tangents while creating a normal map, and the technique is
recommended by the glTF 2.0 specification. Generating vertex tangents with this
tool may resolve rendering issues related to normal maps in engines that cannot
compute MikkTSpace tangents at runtime.
	`.trim())
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.option('--overwrite', 'Overwrite existing vertex tangents', {
		validator: program.BOOLEAN,
		default: false,
	})
	.action(({args, options, logger}) =>
		Session.create(io, logger, args.input, args.output)
			.transform(tangents({generateTangents: mikktspace.generateTangents, ...options}))
	);

// REORDER
program
	.command('reorder', 'Optimize vertex data for locality of reference')
	.help(`
Optimize vertex data for locality of reference.

Choose whether the order should be optimal for transmission size (recommended for Web) or for GPU
rendering performance. When optimizing for transmission size, reordering is expected to be a pre-
processing step before applying Meshopt compression and lossless supercompression (such as gzip or
brotli). Reordering will only reduce size when used in combination with other compression methods.

Based on the meshoptimizer library (https://github.com/zeux/meshoptimizer).
	`.trim())
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.option('--target', 'Whether to optimize for transmission size or GPU performance', {
		validator: ['size', 'performance'],
		default: 'size',
	})
	.action(({args, options, logger}) =>
		Session.create(io, logger, args.input, args.output)
			.transform(reorder({encoder: MeshoptEncoder, ...options}))
	);

program.command('', '\n\n✨ MATERIAL ─────────────────────────────────────────');

// METALROUGH
program
	.command('metalrough', 'Convert materials from spec/gloss to metal/rough')
	.help(`
Convert materials from spec/gloss to metal/rough. In general, the metal/rough
workflow is better supported, more compact, and more future-proof. All features
of the spec/gloss workflow can be converted to metal/rough, as long as the
KHR_materials_specular and KHR_materials_ior extensions are supported. When one
or both of those extensions are not supported, metallic materials may require
further adjustments after the conversion.

This conversion rewrites spec/gloss textures, and the resulting textures may
have less optimal compression than the original. Ideally, lossless PNG textures
should be used as input, and then compressed after this conversion.
	`.trim())
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.action(({args, logger}) =>
		Session.create(io, logger, args.input, args.output)
			.transform(metalRough())
	);

// UNLIT
program
	.command('unlit', 'Convert materials from metal/rough to unlit')
	.help(`
Convert materials to an unlit, shadeless model. Unlit materials are not
affected by scene lighting, and can be rendered very efficiently on less
capable mobile devices. If device framerate is high when an object occupies a
small part of the viewport, and low when that object fills the viewport, it's
likely that the GPU is fragment shader bound, and a simpler material (such as
an unlit material) may improve performance.

Unlit materials are also helpful for non-physically-based visual styles.
	`.trim())
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.action(({args, logger}) =>
		Session.create(io, logger, args.input, args.output)
			.transform(unlit())
	);

program.command('', '\n\n🖼  TEXTURE ──────────────────────────────────────────');

// RESIZE
program
	.command('resize', 'Resize PNG or JPEG textures')
	.help(`
Resize PNG or JPEG textures with Lanczos3 (sharp) or Lanczos2 (smooth)
filtering. Typically Lanczos3 is the best method, but Lanczos2 may be helpful
to reduce ringing artifacts in some cases.

Limits --width and --height are applied as maximum dimensions for each texture,
preserving original aspect ratio. Texture dimensions are never increased.
`.trim())
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.option('--pattern <pattern>', 'Pattern (regex) to match textures, by name or URI.', {
		validator: program.STRING,
	})
	.option('--filter', 'Resampling filter', {
		validator: [TextureResizeFilter.LANCZOS3, TextureResizeFilter.LANCZOS2],
		default: TEXTURE_RESIZE_DEFAULTS.filter,
	})
	.option('--width <pixels>', 'Maximum width (px) of output textures.', {
		validator: program.NUMBER,
		required: true
	})
	.option('--height <pixels>', 'Maximum height (px) of output textures.', {
		validator: program.NUMBER,
		required: true
	})
	.action(async ({args, options, logger}) => {
		const pattern = options.pattern
			? minimatch.makeRe(String(options.pattern), {nocase: true})
			: null;
		return await Session.create(io, logger, args.input, args.output)
			.transform(textureResize({
				size: [options.width, options.height] as vec2,
				filter: options.filter as TextureResizeFilter,
				pattern,
			}));
	});

const BASIS_SUMMARY = `
Compresses textures in the given file to .ktx2 GPU textures using the
{VARIANT} Basis Universal bitstream. GPU textures offer faster GPU upload
and less GPU memory consumption than traditional PNG or JPEG textures,
which are fully uncompressed in GPU memory. GPU texture formats require
more attention to compression settings to get similar visual results.

{DETAILS}

Documentation:
https://gltf-transform.donmccurdy.com/extensions.html#khr_texture_basisu

Dependencies:
KTX-Software (https://github.com/KhronosGroup/KTX-Software/)
`;

// ETC1S
program
	.command('etc1s', 'KTX + Basis ETC1S texture compression')
	.help(
		BASIS_SUMMARY
			.replace('{VARIANT}', 'ETC1S')
			.replace('{DETAILS}', `
ETC1S, one of the two Basis Universal bitstreams, offers lower size and lower
quality than UASTC. In some cases it may be useful to increase the resolution
of the texture, to minimize compression artifacts while still retaining an
overall smaller filesize. Consider using less aggressive compression settings
for normal maps than for other texture types: you may want to use UASTC for
normal maps and ETC1S for other textures, for example.`.trim()),
		{sectionName: 'SUMMARY'}
	)
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.option(
		'--slots <slots>',
		'Texture slots to include (glob)',
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
		'--power-of-two',
		'Resizes any non-power-of-two textures to the closest power-of-two'
		+ ' dimensions, not exceeding 2048x2048px. Required for '
		+ ' compatibility on some older devices and APIs, particularly '
		+ ' WebGL 1.0.',
		{validator: program.BOOLEAN}
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
	.command('uastc', 'KTX + Basis UASTC texture compression')
	.help(
		BASIS_SUMMARY
			.replace('{VARIANT}', 'UASTC')
			.replace('{DETAILS}', `
UASTC, one of the two Basis Universal bitstreams, offers higher size and higher
quality than ETC1S. While it is suitable for all texture types, you may find it
useful to apply UASTC only where higher quality is necessary, and apply ETC1S
for textures where the quality is sufficient.`.trim()),
		{sectionName: 'SUMMARY'}
	)
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.option(
		'--slots <slots>',
		'Texture slots to include (glob)',
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
		'--power-of-two',
		'Resizes any non-power-of-two textures to the closest power-of-two'
		+ ' dimensions, not exceeding 2048x2048px. Required for '
		+ ' compatibility on some older devices and APIs, particularly '
		+ ' WebGL 1.0.',
		{validator: program.BOOLEAN}
	)
	.option(
		'--rdo <uastc_rdo_l>',
		'Enable UASTC RDO post-processing and optionally set UASTC RDO'
		+ ' quality scalar (lambda).  Lower values yield higher'
		+ ' quality/larger LZ compressed files, higher values yield lower'
		+ ' quality/smaller LZ compressed files. A good range to try is [.25, 10].'
		+ ' For normal maps, try [.25, .75]. Full range is [.001, 10.0].',
		{validator: program.NUMBER, default: UASTC_DEFAULTS.rdo}
	)
	.option(
		'--rdo-dictionary-size <uastc_rdo_d>',
		'Set UASTC RDO dictionary size in bytes. Default is 32768. Lower'
		+ ' values=faster, but give less compression. Possible range is [256, 65536].',
		{validator: program.NUMBER, default: UASTC_DEFAULTS.rdoDictionarySize}
	)
	.option(
		'--rdo-block-scale <uastc_rdo_b>',
		'Set UASTC RDO max smooth block error scale. Range is [1.0, 300.0].'
		+ ' Default is 10.0, 1.0 is disabled. Larger values suppress more'
		+ ' artifacts (and allocate more bits) on smooth blocks.',
		{validator: program.NUMBER, default: UASTC_DEFAULTS.rdoBlockScale}
	)
	.option(
		'--rdo-std-dev <uastc_rdo_s>',
		'Set UASTC RDO max smooth block standard deviation. Range is'
		+ ' [.01, 65536.0]. Default is 18.0. Larger values expand the range'
		+ ' of blocks considered smooth.',
		{validator: program.NUMBER, default: UASTC_DEFAULTS.rdoStdDev}
	)
	.option(
		'--rdo-multithreading <uastc_rdo_m>',
		'Enable RDO multithreading (slightly lower compression, non-deterministic).',
		{validator: program.BOOLEAN, default: UASTC_DEFAULTS.rdoMultithreading}
	)
	.option(
		'--zstd <compressionLevel>',
		'Supercompress the data with Zstandard.'
		+ ' Compression level range is [1, 22], or 0 is uncompressed.'
		+ ' Lower values decode faster but offer less compression. Values above'
		+ ' 20 should be used with caution, requiring more memory to decompress:'
		+ '\n\n'
		// Sources:
		// - https://news.ycombinator.com/item?id=13814475
		// - https://github.com/facebook/zstd/blob/15a7a99653c78a57d1ccbf5c5b4571e62183bf4f/lib/compress/zstd_compress.c#L3250
		+ 'Level | Window Size |'
		+ '\n——————|—————————————|'
		+ '\n1     | 256 KB      |'
		+ '\n…     | …           |'
		+ '\n10    | 2 MB        |'
		+ '\n…     | …           |'
		+ '\n18    | 8 MB        |'
		+ '\n19    | 8 MB        |'
		+ '\n20    | 34 MB       |'
		+ '\n21    | 67 MB       |'
		+ '\n22    | 134 MB      |',
		{validator: program.NUMBER, default: UASTC_DEFAULTS.zstd}
	)
	.action(({args, options, logger}) =>
		Session.create(io, logger, args.input, args.output)
			.transform(toktx({mode: Mode.UASTC, ...options}))
	);

// KTXFIX
program
	.command('ktxfix', 'Fixes common issues in KTX texture metadata')
	.help(`
Certain KTX texture metadata was written incorrectly in early (pre-release)
software. In particular, viewers may misinterpret color primaries as sRGB
incorrectly when a texture exhibits this issue.

This command determines correct color primaries based on usage in the glTF
file, and updates the KTX texture accordingly. The change is lossless, and
affects only the container metadata.`.trim())
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.action(({args, logger}) =>
		Session.create(io, logger, args.input, args.output)
			.transform(ktxfix())
	);

program.command('', '\n\n⏯  ANIMATION ────────────────────────────────────────');

// RESAMPLE
program
	.command('resample', 'Resample animations, losslessly deduplicating keyframes')
	.help(`
Resample animations, losslessly deduplicating keyframes. Exporters sometimes
need to "bake" animations, writing data for 20-30 frames per second, in order
to correctly represent IK constraints and other animation techniques. These
additional keyframes are often redundant — particularly with morph targets —
as engines can interpolate animation at 60–120 FPS even with sparse keyframes.

The resampling process removes redundant keyframes from animations using STEP
and LINEAR interpolation. Resampling is nearly lossless, with configurable
--tolerance, and should have no visible effect on animation playback.
	`.trim())
	.argument('<input>', INPUT_DESC)
	.argument('<output>', OUTPUT_DESC)
	.option('--tolerance', 'Per-value tolerance to merge similar keyframes', {
		validator: program.NUMBER,
		default: 1e-4,
	})
	.action(({args, options, logger}) =>
		Session.create(io, logger, args.input, args.output)
			.transform(resample(options as unknown as ResampleOptions))
	);

// SEQUENCE
program
	.command('sequence', 'Animate node visibilities as a flipboard sequence')
	.help(`
Animate node visibilities as a flipboard sequence. An example workflow would
be to create a .glb containing one geometry for each frame of a complex
animation that can't be represented as TRS, skinning, or morph targets. The
sequence function generates a new animation, playing back each mesh matching
the given pattern, at a specific framerate. Displaying a sequence of textures
is also supported, but note that texture memory usage may be quite high and
so this workflow is not a replacement for video playback.
	`.trim())

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

program.option('--vertex-layout <layout>', 'Vertex layout method', {
	global: true,
	default: VertexLayout.INTERLEAVED,
	validator: [VertexLayout.INTERLEAVED, VertexLayout.SEPARATE],
	action: ({options}) => {
		io.setVertexLayout(options.vertexLayout as VertexLayout);
	},
});
program.disableGlobalOption('--quiet');
program.disableGlobalOption('--no-color');

export { program, programReady };
export * from './util';
export * from './transforms';
