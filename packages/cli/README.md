# @gltf-transform/cli

[![Latest NPM release](https://img.shields.io/npm/v/@gltf-transform/cli.svg)](https://www.npmjs.com/package/@gltf-transform/cli)
[![License](https://img.shields.io/npm/l/@gltf-transform/core.svg)](https://github.com/donmccurdy/glTF-Transform/blob/main/LICENSE.md)

Part of the glTF Transform project.

- GitHub: https://github.com/donmccurdy/glTF-Transform
- Project Documentation: https://gltf-transform.dev/
- CLI Documentation: https://gltf-transform.dev/cli

## Quickstart

Install the CLI, supported in Node.js LTS versions.

```bash
npm install --global @gltf-transform/cli
```

List available CLI commands:

```bash
gltf-transform --help
```

Optimize everything all at once:

```bash
gltf-transform optimize input.glb output.glb --texture-compress webp
```

Or pick and choose your optimizations, building a custom pipeline.

Compress mesh geometry with [Draco](https://github.com/google/draco) or [Meshoptimizer](https://meshoptimizer.org/):

```bash
# Draco (compresses geometry).
gltf-transform draco input.glb output.glb --method edgebreaker

# Meshopt (compresses geometry, morph targets, and keyframe animation).
gltf-transform meshopt input.glb output.glb --level medium
```

Resize and compress textures with [Sharp](https://sharp.pixelplumbing.com/), or improve VRAM usage and performance with KTX2 and [Basis Universal](https://github.com/BinomialLLC/basis_universal):

```bash
# Resize textures.
gltf-transform resize input.glb output.glb --width 1024 --height 1024

# Compress textures with WebP.
gltf-transform webp input.glb output.glb --slots "baseColor"

# Compress textures with KTX2 + Basis Universal codecs, UASTC and ETC1S.
gltf-transform uastc input.glb output1.glb \
    --slots "{normalTexture,occlusionTexture,metallicRoughnessTexture}" \
    --level 4 --rdo --rdo-lambda 4 --zstd 18 --verbose
gltf-transform etc1s output1.glb output2.glb --quality 255 --verbose
```

... [and much more](https://gltf-transform.dev/cli).

## Credits

See [*Credits*](https://gltf-transform.dev/credits).

<h2>Commercial Use</h2>

<p>
	<b>Using glTF Transform for a personal project?</b> That's great! Sponsorship is neither expected nor required. Feel
	free to share screenshots if you've made something you're excited about — I enjoy seeing those!
</p>

<p>
	<b>Using glTF Transform in for-profit work?</b> That's wonderful! Your support is important to keep glTF Transform
	maintained, independent, and open source under MIT License. Please consider a
	<a href="https://gltf-transform.dev/pro" target="_blank">subscription</a>
	or
	<a href="https://github.com/sponsors/donmccurdy" target="_blank">GitHub sponsorship</a>.
</p>

<p>
	<i>
		Learn more in the
		<a href="https://gltf-transform.dev/pro" target="_blank"> glTF Transform Pro </a> FAQs</i
	>.
</p>

## License

Copyright 2023, MIT License.
