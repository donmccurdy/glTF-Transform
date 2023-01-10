# glTF-Transform

[![Latest NPM release](https://img.shields.io/npm/v/@gltf-transform/core.svg)](https://www.npmjs.com/package/@gltf-transform/core)
[![Minzipped size](https://badgen.net/bundlephobia/minzip/@gltf-transform/core)](https://bundlephobia.com/result?p=@gltf-transform/core)
[![License](https://img.shields.io/badge/license-MIT-007ec6.svg)](https://github.com/donmccurdy/glTF-Transform/blob/master/LICENSE)

*glTF 2.0 SDK for JavaScript and TypeScript, on Web and Node.js.*

## Introduction

<!-- NOTICE: This section is duplicated in README.md. Please keep them in sync. -->

glTF-Transform supports reading, editing, and writing 3D models in glTF 2.0 format. Unlike 3D modeling tools — which are ideal for artistic changes to geometry, materials, and animation — glTF-Transform provides fast, reproducible, and lossless control of the low-level details in a 3D model. The API automatically manages array indices and byte offsets, which would otherwise require careful management when editing files. These traits make it a good choice for bundling, splitting, or optimizing an existing model. It can also be used to apply quick fixes for common issues, to build a model procedurally, or to easily develop custom extensions on top of the glTF format. Because the core SDK is compatible with both Node.js and Web, glTF-Transform may be used to develop offline workflows and web applications alike.

Packages:

- `@gltf-transform/core`: Core SDK, providing an expressive API to read, edit, and write glTF files.
- `@gltf-transform/extensions`: [Extensions](/extensions.html) (optional glTF features) for the Core SDK.
- `@gltf-transform/functions`: [Functions](/functions.html) for common glTF modifications, written using the core API.
- `@gltf-transform/cli`: [CLI](/cli.html) to apply functions to glTF files quickly or in batch.

## Scripting API

Install the scripting packages:

```bash
npm install --save @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions
```

Read and write glTF scenes with platform I/O utilities {@link WebIO}, {@link NodeIO}, or {@link DenoIO}:

```typescript
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';

// Configure I/O.
const io = new NodeIO()
    .registerExtensions(KHRONOS_EXTENSIONS)
    .registerDependencies({
        'draco3d.decoder': await draco3d.createDecoderModule(), // Optional.
        'draco3d.encoder': await draco3d.createEncoderModule(), // Optional.
    });

// Read from URL.
const document = await io.read('path/to/model.glb');

// Write to byte array (Uint8Array).
const glb = await io.writeBinary(document);
```

To perform changes to an existing glTF {@link Document}, import off-the-shelf scripts from the [Functions](/functions.html) package, or write your own using API classes like {@link Material}, {@link Primitive}, and {@link Texture}.

```typescript
// Import default functions.
import { prune, dedup } from '@gltf-transform/functions';
import * as sharp from 'sharp'; // Node.js-only.

await document.transform(
    // Losslessly resample animation frames.
    resample(),
    // Remove unused nodes, textures, or other data.
    prune(),
    // Remove duplicate vertex or texture data, if any.
    dedup(),
    // Compress mesh geometry with Draco.
    draco(),
    // Convert textures to WebP (Node.js only).
    textureCompress({
        encoder: sharp,
        targetFormat: 'webp',
        resize: [1024, 2024],
    }),
    // Custom transform.
    backfaceCulling({cull: true}),
);

/**
 * Custom transform: enable/disable backface culling.
 */
function backfaceCulling(options) {
    return (document) => {
        for (const material of document.getRoot().listMaterials()) {
            material.setDoubleSided(!options.cull);
        }
    };
}
```

To learn how glTF-Transform works, and the architecture of the scripting API, start with [Concepts](/concepts.html).

## Commandline API

Install the CLI, supported in Node.js v14+.

```bash
npm install --global @gltf-transform/cli
```

List available CLI commands:

```bash
gltf-transform --help
```

Compress mesh geometry with [Draco](https://github.com/google/draco):

```bash
gltf-transform draco input.glb output.glb --method edgebreaker
```

Resize and compress textures with [Sharp](https://sharp.pixelplumbing.com/):

```bash
gltf-transform resize input.glb output.glb --width 1024 --height 1024
gltf-transform webp input.glb output.glb --slots "baseColor"
```

... [and much more](/cli.html).

## Credits

[[include:_CREDITS.md]]
