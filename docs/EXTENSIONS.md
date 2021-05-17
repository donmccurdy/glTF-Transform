# Extensions

Extensions enhance a glTF {@link Document} with additional features and schema, beyond the core
glTF specification. For example, extensions to {@link Material} properties might include additional
textures or scalar properties affecting the Material's appearance in a specific way.

Common extensions may be imported from the `@gltf-transform/extensions` package, or custom
extensions may be created by extending the {@link Extension} base class. No extensions are included
in th default `@gltf-transform/core` package, in order to (1) minimize the code size, and (2)
ensure that any extension can be implemented externally.

Because extensions rely on the same underlying graph structure as the core specification,
references to {@link Texture}, {@link Accessor}, and other resources will be managed
automatically, even by scripts or transforms written without prior knowledge of the extension.
An extension is added to a Document by calling {@link Document.createExtension} with the
extension constructor. The extension object may then be used to construct
{@link ExtensionProperty} instances, which are attached to properties throughout the Document
as prescribed by the extension itself.

## Khronos Extensions

> _**NOTICE:** Khronos extensions are widely supported and recommended for general use._

- {@link DracoMeshCompression KHR_draco_mesh_compression}
- {@link LightsPunctual KHR_lights_punctual}
- {@link MaterialsClearcoat KHR_materials_clearcoat}
- {@link MaterialsIOR KHR_materials_ior}
- {@link MaterialsPBRSpecularGlossiness KHR_materials_pbrSpecularGlossiness}
- {@link MaterialsSheen KHR_materials_sheen}
- {@link MaterialsSpecular KHR_materials_specular}
- {@link MaterialsTransmission KHR_materials_transmission}
- {@link MaterialsUnlit KHR_materials_unlit}
- {@link MaterialsVariants KHR_materials_variants}
- {@link MaterialsVolume KHR_materials_volume}
- {@link MeshQuantization KHR_mesh_quantization}
- {@link TextureBasisu KHR_texture_basisu}
- {@link TextureTransform KHR_texture_transform}

## Vendor Extensions

- {@link TextureWebP EXT_texture_webp}
- {@link MeshGPUInstancing EXT_mesh_gpu_instancing}

## Installation

To use extensions, first install the `@gltf-transform/extensions` package:

```shell
npm install --save @gltf-transform/extensions
```

To open files containing an {@link Extension}, the Extension constructor must be registered with
the {@link PlatformIO} instance used to read the file.

```typescript
// Register all Khronos Group (KHR_) extensions.
import { WebIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
const io = new WebIO().registerExtensions(KHRONOS_EXTENSIONS);

// Register an individual extension.
import { WebIO } from '@gltf-transform/core';
import { MaterialsUnlit } from '@gltf-transform/extensions';
const io = new WebIO().registerExtensions([MaterialsUnlit]);

// Read a file that requires the KHR_materials_unlit extension.
const doc = await io.readGLB('unlit.glb');
```

Reading files requires registering the necessary Extensions, but writing files does not — the
Extension objects are already attached to the Document itself. Some extensions may require
installing dependencies:

```typescript
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';

import draco3d from 'draco3dgltf';

// ...

const io = new NodeIO()
  .registerExtensions(KHRONOS_EXTENSIONS)
  .registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(), // Optional.
    'draco3d.encoder': await draco3d.createEncoderModule(), // Optional.
  });

const doc = io.read('compressed.glb');
```

## Custom extensions

In addition to the official Khronos and multi-vendor extensions, the glTF format can be extended
with [custom extensions](https://github.com/KhronosGroup/glTF/blob/master/extensions/README.md)
for specific applications. glTF-Transform supports reading/writing custom extensions, without
modifications to the core codebase. Any extension implemented correctly and registered with the I/O
instance may be read from a file, modified programmatically, and written back to a file.

For implementation examples, see [packages/extensions](https://github.com/donmccurdy/glTF-Transform/tree/master/packages/extensions).
For further details on the general Extension API, see {@link Extension} and
{@link ExtensionProperty}.
