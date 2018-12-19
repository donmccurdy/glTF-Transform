🚨 In development

# glTF-Transform

![Status](https://img.shields.io/badge/status-experimental-orange.svg)
[![Build Status](https://travis-ci.com/donmccurdy/glTF-Transform.svg?branch=master)](https://travis-ci.com/donmccurdy/glTF-Transform)
[![License](https://img.shields.io/badge/license-MIT-007ec6.svg)](https://github.com/donmccurdy/glTF-Transform/blob/master/LICENSE)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-007ec6.svg)](https://lernajs.io/)

JavaScript and TypeScript utilities for processing glTF 3D models.

Packages:

| package                 | compatibility | description                                                                                                                                          |
|-------------------------|---------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| [core](packages/core)   | Node.js, Web  | Core framework utilities.                                                                                                                            |
| [cli](packages/cli)     | Node.js       | Commandline interface to Node.js-compatible packages.                                                                                                |
|                         |               |                                                                                                                                                      |
| [ao](packages/ao)       | Node.js, Web  | Bakes per-vertex ambient occlusion. Cheaper but lower-quality than AO baked with a UV map.                                                           |
| [atlas](packages/atlas) | Node.js, Web  | Merges small textures and materials, creating a basic texture atlas.                                                                                 |
| [prune](packages/prune) | Node.js, Web  | Prunes duplicate accessors (and more, eventually). Based on a [gist by mattdesl](https://gist.github.com/mattdesl/aea40285e2d73916b6b9101b36d84da8). |
| [split](packages/split) | Node.js, Web  | Splits the binary payload of a glTF file so separate mesh data is in separate .bin files.                                                            |

Utilities in core package:

  - GLTFContainer — Wrapper class for a glTF file and its resources.
  - GLTFUtil — Common utilities for manipulating a GLTFContainer instance.
  - NodeIO - Read/write GLTFContainers from the filesystem.
  - WebIO - Read GLTFContainers from a URL.

Roadmap / ideas / help wanted:

- [ ] deduplicate images
- [ ] defrag bufferviews
- [ ] merge geometry
- [ ] draco (de)compression
- [ ] unlit materials
- [ ] optimize animation
- [ ] sparse accessors
- [ ] flatten node hierarchy
- [ ] compute AABBs

## Usage

### Programmatic

```js
import { GLTFUtil, GLTFContainer, NodeIO, WebIO } from '@gltf-transform/core';
import { ao } from '@gltf-transform/ao';

const io = new WebIO();
const container = io.read( 'scene.gltf' );

// analyze
const analysis = GLTFUtil.analyze( container );

// ambient occlusion
ao( container, { samples: 1000 } );

// serialize
const glbBuffer = GLTFUtil.toGLB( container );
```

### CLI

```shell
# analyze
gltf-transform analyze input.glb

# ambient occlusion
gltf-transform ao --samples 1000 input.glb output.glb
```
## Contributing

This project consists of multiple NPM packages, managed in one repository with
https://lernajs.io/. All code, excluding Node.js-based tests, is written in TypeScript.
I recommend using VSCode for linting and type information, which becomes very helpful
when modifying glTF schema objects.

After cloning the repository, run:

```
npm install && npm install -g lerna
lerna bootstrap
```

The command `lerna bootstrap` will install dependencies into each package, and will then
`npm link` them together. If you make changes to a package's dependencies (e.g. run
`npm install <anything>`) you will need to run `lerna link` again to re-create the symlinks.

To build and test all code, run:

```
lerna run dist
lerna run test
```

To run an arbitrary command across all packages:

```
lerna exec -- <command>
```

While editing any one package, use `npm run dev` in that package to watch and rebuild code
after changes. When editing multiple packages, you may need to run `npm run dev` in each.
To use a local version of the CLI, run `npm link` within the `packages/gltf-transform-cli`
directory. Then `gltf-transform -h` will use local code instead of any global installation.

In the event that dependencies get into a broken state, removing `package-lock.json` and
reinstalling may resolve things.
