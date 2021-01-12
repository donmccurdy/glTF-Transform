# glTF-Transform

[![Latest NPM release](https://img.shields.io/npm/v/@gltf-transform/core.svg)](https://www.npmjs.com/package/@gltf-transform/core)
[![Minzipped size](https://badgen.net/bundlephobia/minzip/@gltf-transform/core)](https://bundlephobia.com/result?p=@gltf-transform/core)
[![License](https://img.shields.io/badge/license-MIT-007ec6.svg)](https://github.com/donmccurdy/glTF-Transform/blob/master/LICENSE)
[![Build Status](https://github.com/donmccurdy/glTF-Parse/workflows/build/badge.svg?branch=master&event=push)](https://github.com/donmccurdy/glTF-Parse/actions?query=workflow%3Abuild)
[![Coverage Status](https://coveralls.io/repos/github/donmccurdy/glTF-Transform/badge.svg?branch=master)](https://coveralls.io/github/donmccurdy/glTF-Transform?branch=master)

*glTF 2.0 SDK for JavaScript, TypeScript, and Node.js.*

<!-- NOTICE: This section is duplicated in docs/INDEX.md. Please keep them in sync. -->

glTF-Transform supports reading, editing, and writing 3D models in glTF 2.0 format. Unlike 3D modeling tools — which are ideal for artistic changes to geometry, materials, and animation — glTF-Transform provides fast, reproducible, and lossless control of the low-level details in 3D model. The API automatically manages array indices and byte offsets, which would otherwise require careful management when editing files. These traits make it a good choice for bundling, splitting, or optimizing an existing model. It can also be used to apply quick fixes for common issues, to build a model procedurally, or to easily develop custom extensions on top of the glTF format. Because the core SDK is compatible with both Node.js and Web, glTF-Transform may be used to develop offline workflows and web applications alike.

glTF-Transform is modular:

- `@gltf-transform/core`: Core SDK, providing an expressive API to read, edit, and write glTF files.
- `@gltf-transform/extensions`: [Extensions](https://gltf-transform.donmccurdy.com/extensions.html) (optional glTF features) for the Core SDK.
- `@gltf-transform/lib`: [Library](https://gltf-transform.donmccurdy.com/library.html) of common functions, written using the core API, that modify glTF files.
- `@gltf-transform/cli`: [Command-line interface](https://gltf-transform.donmccurdy.com/cli.html) to apply changes quickly or in batch.

To get started, head over to the [documentation](https://gltf-transform.donmccurdy.com).

<p align="center">
<img src="https://gltf-transform.donmccurdy.com/media/kicker.jpg" alt="Function symbol, f(📦) → 📦, where the argument and output are a box labeled 'glTF'." width="40%">
</p>

## License

Copyright 2020, MIT License.
