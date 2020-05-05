# @gltf-transform/split

[![Latest NPM release](https://img.shields.io/npm/v/@gltf-transform/split.svg)](https://www.npmjs.com/package/@gltf-transform/split)
[![License](https://img.shields.io/npm/l/@gltf-transform/core.svg)](https://github.com/donmccurdy/glTF-Transform/blob/master/LICENSE)

Part of the glTF-Transform project.

- GitHub: https://github.com/donmccurdy/glTF-Transform
- Documentation: https://gltf-transform.donmccurdy.com/

## Installation

Install:

```
npm install --save @gltf-transform/split
```

Import:

```js
// ES6
import { WebIO } from '@gltf-transform/core';
import { split } from '@gltf-transform/split';

// CommonJS
const { WebIO } = require('@gltf-transform/core');
const { split } = require('@gltf-transform/split');

// Apply.
const io = new WebIO();
const document = await io.read('/model.glb');
document.transform(split({meshes: ['Spinner', 'Gizmo']}));
const glb = io.packGLB(document); // → ArrayBuffer
```

## Options

- **meshes**: List of mesh names to put in separate buffers. Required.
