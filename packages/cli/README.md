# @gltf-transform/cli

[![Latest NPM release](https://img.shields.io/npm/v/@gltf-transform/cli.svg)](https://www.npmjs.com/package/@gltf-transform/cli)
[![License](https://img.shields.io/npm/l/@gltf-transform/core.svg)](https://github.com/donmccurdy/glTF-Transform/blob/master/LICENSE)

Part of the glTF-Transform project.

- GitHub: https://github.com/donmccurdy/glTF-Transform
- Project Documentation: https://gltf-transform.donmccurdy.com/
- CLI Documentation: https://gltf-transform.donmccurdy.com/cli.html

## Quickstart

Install the CLI, supported in Node.js v14+.

```bash
npm install --global @gltf-transform/cli
```

List available CLI commands:

```bash
gltf-transform --help
```

Compress mesh geometry with [Draco](https://github.com/google/draco):

```bash
gltf-transform draco input.glb output.glb --method edgebreaker
```

Resize and compress textures with [Sharp](https://sharp.pixelplumbing.com/):

```bash
gltf-transform resize input.glb output.glb --width 1024 --height 1024
gltf-transform webp input.glb output.glb --slots "baseColor"
```

... [and much more](https://gltf-transform.donmccurdy.com/cli.html).

## Credits

See [*Credits*](https://gltf-transform.donmccurdy.com/credits.html).

## License

Copyright 2023, MIT License.
