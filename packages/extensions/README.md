# @gltf-transform/extensions

[![Latest NPM release](https://img.shields.io/npm/v/@gltf-transform/extensions.svg)](https://www.npmjs.com/package/@gltf-transform/extensions)
[![Minzipped size](https://badgen.net/bundlephobia/minzip/@gltf-transform/extensions)](https://bundlephobia.com/result?p=@gltf-transform/extensions)
[![License](https://img.shields.io/npm/l/@gltf-transform/core.svg)](https://github.com/donmccurdy/glTF-Transform/blob/master/LICENSE)

Part of the glTF-Transform project.

- GitHub: https://github.com/donmccurdy/glTF-Transform
- Project Documentation: https://gltf-transform.donmccurdy.com/
- Package Documentation: https://gltf-transform.donmccurdy.com/extensions.html

## Installation

Install:

```
npm install --save @gltf-transform/extensions
```

Import:

```js
// ES6
import { WebIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';

// CommonJS
const { WebIO } = require('@gltf-transform/core');
const { KHRONOS_EXTENSIONS } = require('@gltf-transform/extensions');

// Register.
const io = new WebIO().registerExtensions(KHRONOS_EXTENSIONS);
const document = await io.read('/model.glb');
```
