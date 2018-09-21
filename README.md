# glTF-Split

![Status](https://img.shields.io/badge/status-experimental-orange.svg)
[![Latest NPM release](https://img.shields.io/npm/v/gltf-split.svg)](https://www.npmjs.com/package/gltf-split)
[![License](https://img.shields.io/npm/l/gltf-split.svg)](https://github.com/donmccurdy/gltf-split/blob/master/LICENSE)
[![Build Status](https://travis-ci.com/donmccurdy/gltf-split.svg?branch=master)](https://travis-ci.com/donmccurdy/gltf-split)

> **NOTICE:** Experimental and incomplete.

Splits a glTF file, so that separate meshes are in separate bin files.

## Installation

```
npm install --global gltf-split
```

## Usage

```
Usage: gltf-split [options] <file>

Options:

  -V, --version          output the version number
  -o, --output <file>    output filename
  -p, --prettyprint      prettyprint JSON
  -m, --meshes <meshes>  comma-delimited mesh names to separate
  -h, --help             output usage information
```

Example:

```
gltf-split original.gltf --output split/split.gltf --meshes MeshA,MeshB

# Input: original.gltf
# Output: split.gltf, MeshA.bin, MeshB.bin
```

## Status

Limitations:

- Input asset must use embedded buffers, not external (.bin) buffers.
- Meshes in the input asset must each use separate buffer views.
- Binary assets (.glb) are not supported.
