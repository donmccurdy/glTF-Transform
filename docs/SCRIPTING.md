# Scripting & CLI

## Installation

Install the core SDK:

```shell
npm install --save @gltf-transform/core
```

Then, import some modules:

```typescript
// ES Modules.
import { Document, Scene, WebIO } from '@gltf-transform/core';

// CommonJS.
const { Document, Scene, WebIO } = require('@gltf-transform/core');
```

All classes described by this documentation are imported from the core package, as shown above.

## Scripting

The Scripting API provides 1:1 parity for glTF's features (within [current limitations](/#limitations)). The documentation for each {@link Property} includes examples related to that glTF feature. A model is encapsulated within the API as a {@link Document}, with methods to add, remove, and edit its data. For a simple example — which would be considerably _less_ simple when editing a raw glTF file without the SDK — suppose we want to add a custom vertex attribute to a specific mesh in our scene.

```typescript
import { WebIO } from '@gltf-transform/core';

// Read GLB or glTF file with Fetch API.
const io = new WebIO();
const doc = await io.read('/path/to/machine.glb');

// Find the mesh primitive to edit.
const mesh = doc.listMeshes()
  .find((mesh) => mesh.getName() === 'Cog')
  .listPrimitives()[0];

// Create some custom data. Let's assume this mesh has 100 vertices, and we
// need to write a VEC3 attribute for each vertex.
const customData = doc.createAccessor('myCustomData')
  .setArray(new Uint16Array(100 * 3).fill(0))
  .setType('VEC3');

primitive.setAttribute('_CUSTOM', customData);

// Write the result to a GLB (ArrayBuffer).
const glb = io.packGLB(doc);
```

## Transforms

Transforms are functions accepting a {@link Document} and some options as input, applying a modification to the model, and returning the updated document. In short, they're scripts for a specific purpose, like the example shown above. This project includes a few simple transforms already, and more are likely to be added in the future. Any transform can be installed as a separate npm package, or accessed through the [command-line interface](#cli).

| package                           | compatibility | description                                                                                                                                                                     |
|-----------------------------------|---------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [ao](packages/ao)                 | Node.js, Web  | Bakes per-vertex ambient occlusion. Cheaper but lower-quality than AO baked with a UV map. Powered by [geo-ambient-occlusion](https://github.com/wwwtyro/geo-ambient-occlusion) |
| [colorspace](packages/colorspace) | Node.js, Web  | Vertex color colorspace correction.                                                                                                                                             |
| [prune](packages/prune)           | Node.js, Web  | Prunes duplicate accessors (and more, eventually). Based on a [gist by mattdesl](https://gist.github.com/mattdesl/aea40285e2d73916b6b9101b36d84da8).                            |
| [split](packages/split)           | Node.js, Web  | Splits the binary payload of a glTF file so separate mesh data is in separate .bin files.                                                                                       |

## CLI

For easier access to existing transforms, glTF-Transform offers a command-line interface. To install it globally, run:

```shell
npm install --global @gltf-transform/cli
```

Run `gltf-transform --help` for general documentation, or `gltf-transform <cmd> --help` for help with particular commands.

```shell
gltf-transform 0.1.0

USAGE

  gltf-transform <command> [options]

COMMANDS

  analyze <input>                  Analyzes a model's contents
  repack <input> <output>          Rewrites the model with minimal changes
  ao <input> <output>              Bakes per-vertex ambient occlusion
  colorspace <input> <output>      Colorspace correction for vertex colors
  prune <input> <output>           Prunes duplicate binary resources
  split <input> <output>           Splits buffers, putting meshes in separate .bin files
  help <command>                   Display help for a specific command

GLOBAL OPTIONS

  -h, --help         Display help
  -V, --version      Display version
  --no-color         Disable colors
  --quiet            Quiet mode - only displays warn and error messages
  -v, --verbose      Verbose mode - will also output debug messages
```
