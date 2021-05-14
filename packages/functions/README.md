# @gltf-transform/functions

[![Latest NPM release](https://img.shields.io/npm/v/@gltf-transform/functions.svg)](https://www.npmjs.com/package/@gltf-transform/functions)
[![Minzipped size](https://badgen.net/bundlephobia/minzip/@gltf-transform/functions)](https://bundlephobia.com/result?p=@gltf-transform/functions)
[![License](https://img.shields.io/npm/l/@gltf-transform/core.svg)](https://github.com/donmccurdy/glTF-Transform/blob/master/LICENSE)

Part of the glTF-Transform project.

- GitHub: https://github.com/donmccurdy/glTF-Transform
- Project Documentation: https://gltf-transform.donmccurdy.com/
- Package Documentation: https://gltf-transform.donmccurdy.com/functions.html

## Installation

Install:

```
npm install --save @gltf-transform/functions
```

Import:

```js
// ES6
import { dedup } from '@gltf-transform/functions';

// CommonJS
const { dedup } = require('@gltf-transform/functions');

// Use.
await document.transform(dedup({textures: true, accessors: false}));
```
