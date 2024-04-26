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
  gltf-transform 4.0.0-alpha.15 — Command-line interface (CLI) for the glTF Transform SDK.

  USAGE 
  
    ▸ gltf-transform <command> [ARGUMENTS...] [OPTIONS...]


  COMMANDS — Type 'gltf-transform help <command>' to get some help about a command

                                                                                                
                                                                                                
                                         🔎 INSPECT ──────────────────────────────────────────  
    inspect                              Inspect contents of the model                          
    validate                             Validate model against the glTF spec                   
                                                                                                
                                                                                                
                                         📦 PACKAGE ──────────────────────────────────────────  
    copy                                 Copy model with minimal changes                        
    optimize                             Optimize model by all available methods                
    merge                                Merge two or more models into one                      
    partition                            Partition binary data into separate .bin files         
    dedup                                Deduplicate accessors and textures                     
    prune                                Remove unreferenced properties from the file           
    gzip                                 Compress model with lossless gzip                      
    xmp                                  Add or modify XMP metadata                             
                                                                                                
                                                                                                
                                         🌍 SCENE ────────────────────────────────────────────  
    center                               Center the scene at the origin, or above/below it      
    instance                             Create GPU instances from shared mesh references       
    flatten                              Flatten scene graph                                    
    join                                 Join meshes and reduce draw calls                      
                                                                                                
                                                                                                
                                         🫖  GEOMETRY ─────────────────────────────────────────  
    draco                                Compress geometry with Draco                           
    meshopt                              Compress geometry and animation with Meshopt           
    quantize                             Quantize geometry, reducing precision and memory       
    dequantize                           Dequantize geometry                                    
    weld                                 Merge equivalent vertices to optimize geometry         
    unweld                               De-index geometry, disconnecting any shared vertices   
    tangents                             Generate MikkTSpace vertex tangents                    
    reorder                              Optimize vertex data for locality of reference         
    simplify                             Simplify mesh, reducing number of vertices             
                                                                                                
                                                                                                
                                         🎨 MATERIAL ─────────────────────────────────────────  
    metalrough                           Convert materials from spec/gloss to metal/rough       
    palette                              Creates palette textures and merges materials          
    unlit                                Convert materials from metal/rough to unlit            
                                                                                                
                                                                                                
                                         🖼  TEXTURE ──────────────────────────────────────────  
    resize                               Resize PNG or JPEG textures                            
    etc1s                                KTX + Basis ETC1S texture compression                  
    uastc                                KTX + Basis UASTC texture compression                  
    ktxfix                               Fixes common issues in KTX texture metadata            
    avif                                 AVIF texture compression                               
    webp                                 WebP texture compression                               
    png                                  PNG texture compression                                
    jpeg                                 JPEG texture compression                               
                                                                                                
                                                                                                
                                         ⏯️  ANIMATION ──────────────────────────────────────── 
    resample                             Resample animations, losslessly deduplicating keyframes
    sequence                             Animate node visibilities as a flipboard sequence      
    sparse                               Reduces storage for zero-filled arrays                 

  GLOBAL OPTIONS

    -h, --help                           Display global help or command-related help.           
    -V, --version                        Display version.                                       
    -v, --verbose                        Verbose mode: will also output debug messages.         
    --allow-http                         Allows reads from HTTP requests.                       
                                         boolean                                                
    --vertex-layout <layout>             Vertex buffer layout preset.                           
                                         one of "interleaved","separate", default: "interleaved"
    --config <path>                      Installs custom commands or extensions. (EXPERIMENTAL) 
```
<!-- end:cli_help -->

The commandline also supports configuration to install custom commands or support for custom glTF extensions. See [configuration](/cli-configuration) for details.

<CommercialUse />
