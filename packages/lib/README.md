# @gltf-transform/lib

[![Latest NPM release](https://img.shields.io/npm/v/@gltf-transform/lib.svg)](https://www.npmjs.com/package/@gltf-transform/lib)
[![Minzipped size](https://badgen.net/bundlephobia/minzip/@gltf-transform/lib)](https://bundlephobia.com/result?p=@gltf-transform/lib)
[![License](https://img.shields.io/npm/l/@gltf-transform/core.svg)](https://github.com/donmccurdy/glTF-Transform/blob/master/LICENSE)

Part of the glTF-Transform project.

- GitHub: https://github.com/donmccurdy/glTF-Transform
- Documentation: https://gltf-transform.donmccurdy.com/

## Installation

Install:

```
npm install --save @gltf-transform/lib
```

Import:

```js
// ES6
import { prune } from '@gltf-transform/lib';

// CommonJS
const { prune } = require('@gltf-transform/lib');

// Use.
await document.transform(prune({textures: true, accessors: false}));
```

## API

TODO(docs): Document lib API.
