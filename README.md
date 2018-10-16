# glTF-Transform

![Status](https://img.shields.io/badge/status-experimental-orange.svg)
[![Build Status](https://travis-ci.com/donmccurdy/gltf-transform.svg?branch=master)](https://travis-ci.com/donmccurdy/gltf-transform)
[![License](https://img.shields.io/npm/l/gltf-transform.svg)](https://github.com/donmccurdy/gltf-transform/blob/master/LICENSE)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lernajs.io/)

JavaScript and TypeScript utilities for processing glTF 3D models.

Core:

- util (`gltf-transform-util`)

Packages:

- split (`gltf-transform-split`)
- atlas (`gltf-transform-atlas`)

Roadmap / ideas / help wanted:

- bake per-vertex occlusion (with regl / headless-gl)
- bake texture occlusion (with regl / headless-gl)
- deduplicate accessors and buffers
- draco (de)compression
- unlit materials
- optimize animation
- sparse accessors
- ...
