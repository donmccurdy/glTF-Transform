# @gltf-transform/ao

[![Latest NPM release](https://img.shields.io/npm/v/@gltf-transform/ao.svg)](https://www.npmjs.com/package/@gltf-transform/ao)
[![License](https://img.shields.io/npm/l/@gltf-transform/core.svg)](https://github.com/donmccurdy/glTF-Transform/blob/master/LICENSE)

Part of the glTF-Transform project.

- GitHub: https://github.com/donmccurdy/glTF-Transform
- Documentation: https://gltf-transform.donmccurdy.com/

## Installation

Install:

```
npm install --save @gltf-transform/ao
```

Import:

```js
// ES6
import { WebIO } from '@gltf-transform/core';
import { ao } from '@gltf-transform/ao';

// CommonJS
const { WebIO } = require('@gltf-transform/core');
const { ao } = require('@gltf-transform/ao');

// Apply.
const io = new WebIO();
const document = await io.read('/model.glb');
document.transform(ao({samples: 1000}));
const glb = io.packGLB(document); // → ArrayBuffer
```

## Options

- **gl**: Callback taking `(width, height)` as parameters, and returning a GL instance. Optional on web; Requires `headless-gl` in Node.js.
- **resolution**: Resolution of depth buffer. Default: 512.
- **samples**: Number of samples to draw. Default: 500.
