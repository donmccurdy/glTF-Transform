# glTF-Transform

[![Latest NPM release](https://img.shields.io/npm/v/@gltf-transform/core.svg)](https://www.npmjs.com/package/@gltf-transform/core)
[![Minzipped size](https://badgen.net/bundlephobia/minzip/@gltf-transform/core)](https://bundlephobia.com/result?p=@gltf-transform/core)
[![License](https://img.shields.io/badge/license-MIT-007ec6.svg)](https://github.com/donmccurdy/glTF-Transform/blob/master/LICENSE)
[![Lerna](https://img.shields.io/badge/maintained%20with-lerna-007ec6.svg)](https://lerna.js.org/)
[![Build Status](https://travis-ci.com/donmccurdy/glTF-Transform.svg?branch=master)](https://travis-ci.com/donmccurdy/glTF-Transform)
[![Coverage Status](https://coveralls.io/repos/github/donmccurdy/glTF-Transform/badge.svg?branch=master)](https://coveralls.io/github/donmccurdy/glTF-Transform?branch=master)

*glTF 2.0 SDK for JavaScript, TypeScript, and Node.js.*

<!-- NOTICE: This section is duplicated in docs/INDEX.md. Please keep them in sync. -->

glTF-Transform supports reading, editing, and writing 3D models in glTF 2.0 format. Unlike 3D modeling tools — which are ideal for artistic changes to geometry, materials, and animation — glTF-Transform provides fast, reproducible, and lossless control of the low-level details in 3D model. The API automatically manages array indices and byte offsets, which would otherwise require careful management when editing files. These traits make it a good choice for bundling, splitting, or optimizing an existing model. It can also be used to apply quick fixes for common issues, to build a model procedurally, or to easily develop custom extensions on top of the glTF format. Because the core SDK is compatible with both Node.js and Web, glTF-Transform may be used to develop offline workflows and web applications alike.

glTF-Transform is modular, and can be used in several ways:

- `@gltf-transform/core`: Core SDK, providing an expressive API to read, edit, and write glTF files.
- `@gltf-transform/cli`: Command-line interface to apply any available transform to a glTF file.
- `@gltf-transform/*`: Growing collection of transforms, written using the core API, that modify glTF files.

To get started, head over to the [documentation](https://gltf-transform.donmccurdy.com).

## License

MIT License.
