# glTF-Transform

[![Latest NPM release](https://img.shields.io/npm/v/@gltf-transform/core.svg)](https://www.npmjs.com/package/@gltf-transform/core)
[![Minzipped size](https://badgen.net/bundlephobia/minzip/@gltf-transform/core)](https://bundlephobia.com/result?p=@gltf-transform/core)
[![License](https://img.shields.io/badge/license-MIT-007ec6.svg)](https://github.com/donmccurdy/glTF-Transform/blob/master/LICENSE)

*glTF 2.0 SDK for JavaScript, TypeScript, and Node.js.*

## Introduction

<!-- NOTICE: This section is duplicated in README.md. Please keep them in sync. -->

glTF-Transform supports reading, editing, and writing 3D models in glTF 2.0 format. Unlike 3D modeling tools — which are ideal for artistic changes to geometry, materials, and animation — glTF-Transform provides fast, reproducible, and lossless control of the low-level details in 3D model. The API automatically manages array indices and byte offsets, which would otherwise require careful management when editing files. These traits make it a good choice for bundling, splitting, or optimizing an existing model. It can also be used to apply quick fixes for common issues, to build a model procedurally, or to easily develop custom extensions on top of the glTF format. Because the core SDK is compatible with both Node.js and Web, glTF-Transform may be used to develop offline workflows and web applications alike.

glTF-Transform is modular:

- `@gltf-transform/core`: Core SDK, providing an expressive API to read, edit, and write glTF files.
- `@gltf-transform/extensions`: [Extensions](/extensions.html) (optional glTF features) for the Core SDK.
- `@gltf-transform/functions`: [Functions](/functions.html) for common glTF modifications, written using the core API.
- `@gltf-transform/cli`: [Command-line interface](/cli.html) to apply changes quickly or in batch.

## Getting started

To learn how glTF-Transform works, see [Concepts](/concepts.html). To get started developing with the SDK, see [SDK Installation](#sdk-installation) below. Find [Functions](/functions.html) for example scripts created with the SDK already. To use the commandline interface, see [Commandline (CLI)](/cli.html). If you're interested in contributing to or customizing the project, see [contributing](/contributing.html).

### SDK Installation

Install the core SDK for programmatic use:

```shell
npm install --save @gltf-transform/core
```

Then, import some modules:

```typescript
// ES Modules.
import { Document, Scene, WebIO } from '@gltf-transform/core';

// CommonJS.
const { Document, Scene, WebIO } = require('@gltf-transform/core');
```

All classes described by this documentation are imported from the core package, as shown above. Most projects should start with the {@link Document} or {@link PlatformIO} classes.
