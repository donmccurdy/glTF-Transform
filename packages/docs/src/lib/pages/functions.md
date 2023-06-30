---
title: Functions | glTF Transform
snippet: Common glTF modifications, written using the core API. Most of these functions are Transforms, applying a modification to the Document…
---

# Functions

Common operations on glTF data are implemented by the `@gltf-transform/functions` module, and are organized in two categories: _Transforms_ and _Functions_.

Installation:

```bash
npm install --save @gltf-transform/functions
```

## Transforms

_Transforms_ apply a modification to the [Document](/modules/core/classes/Document), and are applied with the
[Document.transform](/modules/core/classes/Document#transform) method. glTF Transform includes many expressive transforms already, and
others can be implemented easily using the same APIs.

```typescript
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, quantize, dedup } from '@gltf-transform/functions';

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const document = await io.read('input.glb');

await document.transform(
	weld(),
	quantize(),
	dedup(),

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

await io.write('output.glb', document);
```

For a complete list of available transforms, see the navigation sidebar.

## Functions

Other functions, like [getBounds](/modules/functions/functions/getBounds) or [compressTexture](/modules/functions/functions/compressTexture), are utility functions for general-purpose use. When making changes narrowly to a specific Texture or Material, these offer more targeted alternatives Transforms affecting the entire Document.

For a complete list of available functions, see the navigation sidebar.
