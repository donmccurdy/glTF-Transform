# Library

Collection of common functions, written using the core API, that modify glTF files.

## Installation

Install the 'core' and 'lib' packages:

```shell
npm install --save @gltf-transform/core @gltf-transform/lib
```

Then, import some modules:

```typescript
import { WebIO } from '@gltf-transform/core';
import { ao, dedup } from '@gltf-transform/lib';

const doc = await new WebIO().readGLB('path/to/model.glb');
await doc.transform(
  ao({samples: 500}),
  dedup({textures: true})
);
```

## Transforms

Transforms are functions applying a modification to the {@link Document}. This project includes a few simple transforms already, and more are likely to be added in the future.

| transform                           | compatibility | description                                                                                                                                                                     |
|-------------------------------------|---------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [ao](https://github.com/donmccurdy/glTF-Transform/tree/master/packages/lib/src/ao.ts)                 | Node.js, Web  | Bakes per-vertex ambient occlusion. Cheaper but lower-quality than AO baked with a UV map. Powered by [geo-ambient-occlusion](https://github.com/wwwtyro/geo-ambient-occlusion) |
| [colorspace](https://github.com/donmccurdy/glTF-Transform/tree/master/packages/lib/src/colorspace.ts) | Node.js, Web  | Vertex color colorspace correction.                                                                                                                                             |
| [center](https://github.com/donmccurdy/glTF-Transform/tree/master/packages/lib/src/center.ts)         | Node.js, Web  | Centers the {@link Scene} at the origin, or above/below it.                                                                                                                     |
| [dedup](https://github.com/donmccurdy/glTF-Transform/tree/master/packages/lib/src/dedup.ts)           | Node.js, Web  | Removes duplicate {@link Accessor} and {@link Texture} properties. Based on a [gist by mattdesl](https://gist.github.com/mattdesl/aea40285e2d73916b6b9101b36d84da8).            |
| [instance](https://github.com/donmccurdy/glTF-Transform/tree/master/packages/lib/src/instance.ts)     | Node.js, Web  | Creates GPU instances (with `EXT_mesh_gpu_instancing`) for shared {@link Mesh} references.                                                                                      |
| [metalRough](https://github.com/donmccurdy/glTF-Transform/tree/master/packages/lib/src/metal-rough.ts)| Node.js, Web  | Convert {@link Material}s from spec/gloss to metal/rough, removing `KHR_materials_pbrSpecularGlossiness`.                                                                       |
| [partition](https://github.com/donmccurdy/glTF-Transform/tree/master/packages/lib/src/partition.ts)   | Node.js, Web  | Partitions the binary payload of a glTF file so separate mesh or animation data is in separate `.bin` {@link Buffer}s.                                                          |
| [prune](https://github.com/donmccurdy/glTF-Transform/tree/master/packages/lib/src/prune.ts)           | Node.js, Web  | Removes properties from the file if they are not referenced by a {@link Scene}.                                                                                                 |
| [quantize](https://github.com/donmccurdy/glTF-Transform/tree/master/packages/lib/src/quantize.ts)     | Node.js, Web  | Quantizes vertex attributes, reducing the size and memory footprint of the file.                                                                                                |
| [resample](https://github.com/donmccurdy/glTF-Transform/tree/master/packages/lib/src/resample.ts)     | Node.js, Web  | Resample {@link Animation}s, losslessly deduplicating keyframes to reduce file size.                                                                                            |
| [sequence](https://github.com/donmccurdy/glTF-Transform/tree/master/packages/lib/src/sequence.ts)     | Node.js, Web  | Creates an {@link Animation} displaying each of the specified {@link Node}s sequentially.                                                                                       |
| [tangents](https://github.com/donmccurdy/glTF-Transform/tree/master/packages/lib/src/tangents.ts)     | Node.js, Web  | Generates MikkTSpace vertex tangents for mesh primitives, which may fix rendering issues occuring with some baked normal maps.                                                  |
| [weld](https://github.com/donmccurdy/glTF-Transform/tree/master/packages/lib/src/weld.ts)             | Node.js, Web  | Index {@link Primitive}s and (optionally) merge similar vertices.                                                                                                               |
| [unweld](https://github.com/donmccurdy/glTF-Transform/tree/master/packages/lib/src/unweld.ts)         | Node.js, Web  | De-index {@link Primitive}s, disconnecting any shared vertices.                                                                                                                 |

## Other functions

| function | compatibility | description |
|----------|---------------|-------------|
| [inspect](https://github.com/donmccurdy/glTF-Transform/tree/master/packages/lib/src/inspect.ts)       | Node.js, Web  | Inspects the contents of a glTF file and returns a report. |
| [bounds](https://github.com/donmccurdy/glTF-Transform/tree/master/packages/lib/src/bounds.ts)       | Node.js, Web  | Computes world bounding box of given {@link Node} or {@link Scene}, ignoring animation. |

