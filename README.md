# glTF-Split

> **NOTICE:** Experimental and incomplete.

Splits a glTF file, so that separate meshes are in separate bin files.

## Installation

```
npm i -g gltf-split
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
