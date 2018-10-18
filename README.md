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

- split (`gltf-transform-split`)
  - Splits the binary payload of a glTF file so separate mesh data is in separate .bin files.
- atlas (`gltf-transform-atlas`)
  - Merges small textures and materials, creating a basic texture atlas.

Roadmap / ideas / help wanted:

- [ ] bake per-vertex occlusion (with regl / headless-gl)
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
