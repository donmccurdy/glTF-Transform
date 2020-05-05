# @gltf-transform/colorspace

[![Latest NPM release](https://img.shields.io/npm/v/@gltf-transform/colorspace.svg)](https://www.npmjs.com/package/@gltf-transform/colorspace)
[![License](https://img.shields.io/npm/l/@gltf-transform/core.svg)](https://github.com/donmccurdy/glTF-Transform/blob/master/LICENSE)

Part of the glTF-Transform project.

- GitHub: https://github.com/donmccurdy/glTF-Transform
- Documentation: https://gltf-transform.donmccurdy.com/

## Installation

Install:

```
npm install --save @gltf-transform/colorspace
```

Import:

```js
// ES6
import { WebIO } from '@gltf-transform/core';
import { colorspace } from '@gltf-transform/colorspace';

// CommonJS
const { WebIO } = require('@gltf-transform/core');
const { colorspace } = require('@gltf-transform/colorspace');

// Apply.
const io = new WebIO();
const document = await io.read('/model.glb');
document.transform(colorspace({inputEncoding: 'sRGB'}));
const glb = io.packGLB(document); // → ArrayBuffer
```

## Options

- **inputEncoding**: Currently accepts only `"sRGB"`. Required.
