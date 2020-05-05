# @gltf-transform/prune

[![Latest NPM release](https://img.shields.io/npm/v/@gltf-transform/prune.svg)](https://www.npmjs.com/package/@gltf-transform/prune)
[![License](https://img.shields.io/npm/l/@gltf-transform/core.svg)](https://github.com/donmccurdy/glTF-Transform/blob/master/LICENSE)

Part of the glTF-Transform project.

- GitHub: https://github.com/donmccurdy/glTF-Transform
- Documentation: https://gltf-transform.donmccurdy.com/

## Installation

Install:

```
npm install --save @gltf-transform/prune
```

Import:

```js
// ES6
import { WebIO } from '@gltf-transform/core';
import { prune } from '@gltf-transform/prune';

// CommonJS
const { WebIO } = require('@gltf-transform/core');
const { prune } = require('@gltf-transform/prune');

// Apply.
const io = new WebIO();
const document = await io.read('/model.glb');
document.transform(prune({accessors: true, textures: false}));
const glb = io.packGLB(document); // → ArrayBuffer
```

## Options

- **accessors**: Whether to prune duplicate accessors. Default `true`.
- **textures**: Whether to prune duplicate textures. Default `true`.
