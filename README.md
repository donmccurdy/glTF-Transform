🚨 Under development

# glTF-Transform

![Status](https://img.shields.io/badge/status-experimental-orange.svg)
[![Build Status](https://travis-ci.com/donmccurdy/gltf-transform.svg?branch=master)](https://travis-ci.com/donmccurdy/gltf-transform)
[![License](https://img.shields.io/badge/license-MIT-007ec6.svg)](https://github.com/donmccurdy/gltf-transform/blob/master/LICENSE)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-007ec6.svg)](https://lernajs.io/)

JavaScript and TypeScript utilities for processing glTF 3D models.

Packages:

- [x] util (`gltf-transform-util`)
  - GLTFContainer — Wrapper class for a glTF file and its resources.
  - GLTFUtil — Common utilities for manipulating a GLTFContainer instance.
  - NodeIO - Read/write GLTFContainers from the filesystem.
  - WebIO - Read GLTFContainers from a URL.
- [x] cli (`gltf-transform-cli`)
  - Provides a CLI interface to Node.js-compatible packages.
- [x] occlusionVertex (`gltf-occlusion-vertex`)
  - Bakes per-vertex ambient occlusion.
- [x] prune (`gltf-transform-prune`)
  - Prunes duplicate accessors (and, in the future, images).
- [x] split (`gltf-transform-split`)
  - Splits the binary payload of a glTF file so separate mesh data is in separate .bin files.
- [ ] atlas (`gltf-transform-atlas`)
  - Merges small textures and materials, creating a basic texture atlas.

TODO:

- [ ] run validator on outputs
- [ ] more unit tests on util functions

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
import { GLTFUtil, GLTFContainer, NodeIO, WebIO } from 'gltf-transform-util';
import { occlusionVertex } from 'gltf-transform-occlusion-vertex';

const io = new WebIO();
const container = io.read( 'scene.gltf' );

// analyze
const analysis = GLTFUtil.analyze( container );

// ambient occlusion
occlusionVertex( container, { samples: 1000 } );

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
