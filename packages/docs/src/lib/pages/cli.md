---
title: Command-line quickstart | glTF Transform
snippet: For easier access to its library, glTF Transform offers a command-line interface (CLI). The CLI supports many of the features of the…
---

<script context="module" lang="ts">
import CommercialUse from '$lib/components/commercial-use.svelte';
</script>

# Command-line quickstart

For easier access to its library, glTF Transform offers a command-line interface (CLI). The
CLI supports many of the features of the `@gltf-transform/functions` package, and some general
tools for inspecting and packing/unpacking glTF or GLB files.

Installation:

```bash
npm install --global @gltf-transform/cli
```

<details>
  <summary><i>Troubleshooting</i></summary>

  glTF Transform uses [Sharp](https://sharp.pixelplumbing.com/) to optimize images. If you encounter errors during
  installation related to Sharp, consult the [Sharp installation](https://sharp.pixelplumbing.com/install) page. When
  installing the glTF Transform CLI in China, a mirror site provided by Alibaba
  may be required:

  ```bash
npm config set sharp_binary_host "https://npmmirror.com/mirrors/sharp"
npm config set sharp_libvips_binary_host "https://npmmirror.com/mirrors/sharp-libvips"
npm install --global @gltf-transform/cli
  ```

</details>

To run the most common optimizations in one easy step, use the `optimize` command:

```bash
gltf-transform optimize input.glb output.glb --compress draco --texture-compress webp
```

Defaults in the `optimize` command may not be ideal for all scenes. Some of
its features can be configured (`optimize -h`), or more advanced users
may wish to inspect their scenes then pick and choose optimizations.

```bash
gltf-transform inspect input.glb
```

The report printed by the `inspect` command should identify performance issues,
and whether the scene is generally geometry-heavy, texture-heavy,
has too many draw calls, etc. Apply individual commands below to deal with any of
these issues as needed.

Full command list:

<!-- begin:cli_help -->
```plaintext
```
<!-- end:cli_help -->

The commandline also supports configuration to install custom commands or support for custom glTF extensions. See [configuration](/cli-configuration) for details.

<CommercialUse />
