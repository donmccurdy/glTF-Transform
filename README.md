> 🚨 Under development

# glTF-Transform

![Status](https://img.shields.io/badge/status-experimental-orange.svg)
[![Build Status](https://travis-ci.com/donmccurdy/gltf-transform.svg?branch=master)](https://travis-ci.com/donmccurdy/gltf-transform)
[![License](https://img.shields.io/badge/license-MIT-007ec6.svg)](https://github.com/donmccurdy/gltf-transform/blob/master/LICENSE)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-007ec6.svg)](https://lernajs.io/)

JavaScript and TypeScript utilities for processing glTF 3D models.

Core:

- [x] util (`gltf-transform-util`)
  - GLTFContainer — Wrapper class for a glTF file and its resources.
  - GLTFUtil — Common utilities for manipulating a GLTFContainer instance.
- [ ] cli (`gltf-transform-cli`)
  - Provides a CLI interface to Node.js-compatible packages.

Packages:

- [x] split (`gltf-transform-split`)
  - Splits the binary payload of a glTF file so separate mesh data is in separate .bin files.
- [x] occlusionVertex (`gltf-occlusion-vertex`)
  - Bakes per-vertex ambient occlusion.
- [ ] atlas (`gltf-transform-atlas`)
  - Merges small textures and materials, creating a basic texture atlas.

Roadmap / ideas / help wanted:

- [ ] bake texture occlusion (with regl / headless-gl)
- [ ] deduplicate accessors
- [ ] merge geometry
- [ ] merge files
- [ ] draco (de)compression
- [ ] unlit materials
- [ ] optimize animation
- [ ] sparse accessors
- [ ] colorspace fixes
- [ ] flatten node hierarchy

## Usage (not yet implemented)

### Programmatic

```js
import { GLTFUtil, GLTFContainer } from 'gltf-transform-util';
import { split } from 'gltf-transform-split';
import { occlusionVertex } from 'gltf-transform-occlusion-vertex';


const container = GLTFUtil.wrapGLTF( myJSON, { 'scene.bin': buffer } );
split( container, { meshes: [ 'A', 'B' ] } );
occlusionVertex( container, { samples: 1000 } );
const glbBuffer = GLTFUtil.bundleGLB( container );
```

### CLI

```shell
gltf-transform -i input.glb -o output.glb [ split --meshes A,B ] [ occlusionVertex --samples 1000 ] [ draco ]
```
