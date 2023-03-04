# @gltf-transform/functions

[![Latest NPM release](https://img.shields.io/npm/v/@gltf-transform/functions.svg)](https://www.npmjs.com/package/@gltf-transform/functions)
[![Minzipped size](https://badgen.net/bundlephobia/minzip/@gltf-transform/functions)](https://bundlephobia.com/result?p=@gltf-transform/functions)
[![License](https://img.shields.io/npm/l/@gltf-transform/core.svg)](https://github.com/donmccurdy/glTF-Transform/blob/master/LICENSE)

Part of the glTF-Transform project.

- GitHub: https://github.com/donmccurdy/glTF-Transform
- Project Documentation: https://gltf-transform.donmccurdy.com/
- Package Documentation: https://gltf-transform.donmccurdy.com/functions.html

## Quickstart

Install the scripting packages:

```bash
npm install --save @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions
```

Read and write glTF scenes with platform I/O utilities [WebIO](https://gltf-transform.donmccurdy.com/classes/core.webio.html), [NodeIO](https://gltf-transform.donmccurdy.com/classes/core.nodeio.html), or [DenoIO](https://gltf-transform.donmccurdy.com/classes/core.denoio.html):

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

To perform changes to an existing glTF [Document](https://gltf-transform.donmccurdy.com/classes/core.document.html), import off-the-shelf scripts from the [Functions](https://gltf-transform.donmccurdy.com/functions.html) package, or write your own using API classes like [Material](https://gltf-transform.donmccurdy.com/classes/core.material.html), [Primitive](https://gltf-transform.donmccurdy.com/classes/core.primitive.html), and [Texture](https://gltf-transform.donmccurdy.com/classes/core.texture.html).

```typescript
import { resample, prune, dedup, draco, textureCompress } from '@gltf-transform/functions';
import * as sharp from 'sharp'; // Node.js only.

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

To learn how glTF-Transform works, and the architecture of the scripting API, start with [Concepts](https://gltf-transform.donmccurdy.com/concepts.html). To try out the scripting API without installing anything, visit [gltf.report/](https://gltf.report/), load a glTF model, and open the *Script* tab.

## Credits

See [*Credits*](https://gltf-transform.donmccurdy.com/credits.html).

## License

Copyright 2023, MIT License.
