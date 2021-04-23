# @gltf-transform/lib

[![Latest NPM release](https://img.shields.io/npm/v/@gltf-transform/lib.svg)](https://www.npmjs.com/package/@gltf-transform/lib)
[![Minzipped size](https://badgen.net/bundlephobia/minzip/@gltf-transform/lib)](https://bundlephobia.com/result?p=@gltf-transform/lib)
[![License](https://img.shields.io/npm/l/@gltf-transform/core.svg)](https://github.com/donmccurdy/glTF-Transform/blob/master/LICENSE)

Part of the glTF-Transform project.

- GitHub: https://github.com/donmccurdy/glTF-Transform
- Project Documentation: https://gltf-transform.donmccurdy.com/
- Package Documentation: https://gltf-transform.donmccurdy.com/library.html

## Installation

Install:

```
npm install --save @gltf-transform/lib
```

Import:

```js
// ES6
import { dedup } from '@gltf-transform/lib';

// CommonJS
const { dedup } = require('@gltf-transform/lib');

// Use.
await document.transform(dedup({textures: true, accessors: false}));
```
