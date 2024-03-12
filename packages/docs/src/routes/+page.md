<script context="module" lang="ts">
import CommercialUse from '$lib/components/commercial-use.svelte';
import License from '$lib/components/license.svelte';
</script>

# glTF Transform

[![Latest NPM release](https://img.shields.io/npm/v/@gltf-transform/core.svg)](https://www.npmjs.com/package/@gltf-transform/core)
[![Minzipped size](https://badgen.net/bundlephobia/minzip/@gltf-transform/core)](https://bundlephobia.com/result?p=@gltf-transform/core)
[![License](https://img.shields.io/badge/license-MIT-007ec6.svg)](https://github.com/donmccurdy/glTF-Transform/blob/master/LICENSE)

*glTF 2.0 SDK for JavaScript and TypeScript, on Web and Node.js.*

## Introduction

<!-- NOTICE: This section is duplicated in README.md. Please keep them in sync. -->

glTF Transform supports reading, editing, and writing 3D models in glTF 2.0 format. Unlike 3D modeling tools — which are ideal for artistic changes to geometry, materials, and animation — glTF Transform provides fast, reproducible, and lossless control of the low-level details in a 3D model. The API automatically manages array indices and byte offsets, which would otherwise require careful management when editing files. These traits make it a good choice for bundling, splitting, or optimizing an existing model. It can also be used to apply quick fixes for common issues, to build a model procedurally, or to easily develop custom extensions on top of the glTF format. Because the core SDK is compatible with both Node.js and Web, glTF Transform may be used to develop offline workflows and web applications alike.

Packages:

- `@gltf-transform/core`: Core SDK, providing an expressive API to read, edit, and write glTF files.
- `@gltf-transform/extensions`: [Extensions](/extensions) (optional glTF features) for the Core SDK.
- `@gltf-transform/functions`: [Functions](/functions) for common glTF modifications, written using the core API.
- `@gltf-transform/cli`: [Command-line interface (CLI)](/cli) to apply functions to glTF files quickly or in batch.

## Scripting API

Install the scripting packages:

```bash
npm install --save @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions
```

Read and write glTF scenes with platform I/O utilities [WebIO](/modules/core/classes/WebIO), [NodeIO](/modules/core/classes/NodeIO), or [DenoIO](/modules/core/classes/DenoIO):

```typescript
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';

// Configure I/O.
const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
        'draco3d.decoder': await draco3d.createDecoderModule(), // Optional.
        'draco3d.encoder': await draco3d.createEncoderModule(), // Optional.
    });

// Read from URL.
const document = await io.read('path/to/model.glb');

// Write to byte array (Uint8Array).
const glb = await io.writeBinary(document);
```

To perform changes to an existing glTF [Document](/modules/core/classes/Document), import off-the-shelf scripts from the [Functions](/functions) package or write your own using API classes like [Material](/modules/core/classes/Material), [Primitive](/modules/core/classes/Primitive), and [Texture](/modules/core/classes/Texture).

```typescript
import { resample, prune, dedup, draco, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp'; // Node.js only.

await document.transform(
    // Losslessly resample animation frames.
    resample(),
    // Remove unused nodes, textures, or other data.
    prune(),
    // Remove duplicate vertex or texture data, if any.
    dedup(),
    // Compress mesh geometry with Draco.
    draco(),
    // Convert textures to WebP (Requires glTF Transform v3 and Node.js).
    textureCompress({
        encoder: sharp,
        targetFormat: 'webp',
        resize: [1024, 2024],
    }),
    // Custom transform.
    backfaceCulling({cull: true}),
);

// Custom transform: enable/disable backface culling.
function backfaceCulling(options) {
    return (document) => {
        for (const material of document.getRoot().listMaterials()) {
            material.setDoubleSided(!options.cull);
        }
    };
}
```

To learn how glTF Transform works, and the architecture of the scripting API, start with [Concepts](/concepts). To try out the scripting API without installing anything, visit [gltf.report/](https://gltf.report/), load a glTF model, and open the *Script* tab.

## Command-line API

Install the CLI, supported in Node.js LTS versions.

```bash
npm install --global @gltf-transform/cli
```

List available CLI commands:

```bash
gltf-transform --help
```

Optimize everything all at once:

```bash
gltf-transform optimize input.glb output.glb --texture-compress webp
```

Or pick and choose your optimizations, building a custom pipeline.

Compress mesh geometry with [Draco](https://github.com/google/draco) or [Meshoptimizer](https://meshoptimizer.org/):

```bash
# Draco (compresses geometry).
gltf-transform draco input.glb output.glb --method edgebreaker

# Meshopt (compresses geometry, morph targets, and keyframe animation).
gltf-transform meshopt input.glb output.glb --level medium
```

Resize and compress textures with [Sharp](https://sharp.pixelplumbing.com/), or improve VRAM usage and performance with KTX2 and [Basis Universal](https://github.com/BinomialLLC/basis_universal):

```bash
# Resize textures.
gltf-transform resize input.glb output.glb --width 1024 --height 1024

# Compress textures with WebP.
gltf-transform webp input.glb output.glb --slots "baseColor"

# Compress textures with KTX2 + Basis Universal codecs, UASTC and ETC1S.
gltf-transform uastc input.glb output1.glb \
    --slots "{normalTexture,occlusionTexture,metallicRoughnessTexture}" \
    --level 4 --rdo --rdo-lambda 4 --zstd 18 --verbose
gltf-transform etc1s output1.glb output2.glb --quality 255 --verbose
```

... [and much more](/cli).

<CommercialUse />

<License />
