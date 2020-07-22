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
Extension objects are already attached to the Document itself.

## API

When generating a glTF {@link Document}, import the {@link Extension} constructor and pass it to
the {@link Document.createExtension} factory method.

```typescript
import { Document } from '@gltf-transform/core';
import { MaterialsUnlit, Unlit } from '@gltf-transform/extensions';

// Create Document, and an instance of the KHR_materials_unlit extension.
const doc = new Document();
const unlitExtension = doc.createExtension(MaterialsUnlit).setRequired(false);

// Create a Material, and attach an Unlit property to it.
const unlit = unlitExtension.createUnlit();
doc.createMaterial('MyUnlitMaterial').setExtension(Unlit, unlit);
```

The {@link Extension} instance is then used to construct {@link ExtensionProperty} instances
related to that Extension. Some Extensions, like `KHR_mesh_quantization`, have no Properties and
simply have a holistic effect on the entire Document. Only one ExtensionProperty from a given
Extension can be attached to any given Property at a time. Properties may have ExtensionProperties
from multiple Extensions attached.

For further details on the general Extension API, see {@link Extension} and
{@link ExtensionProperty}.

### Custom extensions

In addition to the official Khronos and multi-vendor extensions, the glTF format can be extended
with [custom extensions](https://github.com/KhronosGroup/glTF/blob/master/extensions/README.md)
for specific applications. glTF-Transform supports reading/writing custom extensions, without
modifications to the core codebase. Any extension implemented correctly and registered with the I/O
instance may be read from a file, modified programmatically, and written back to a file.

For implementation examples, see [packages/extensions](https://github.com/donmccurdy/glTF-Transform/tree/master/packages/extensions).

## Supported extensions

- [KHR_materials_clearcoat](#khr_materials_clearcoat)
- [KHR_materials_unlit](#khr_materials_unlit)
- [KHR_mesh_quantization](#khr_mesh_quantization)
- [KHR_texture_basisu](#khr_texture_basisu-experimental) *(experimental)*

### KHR_materials_clearcoat

- *Specification: [KHR_materials_clearcoat](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_materials_clearcoat/)*
- *Source: [packages/extensions/src/khr-materials-clearcoat/](https://github.com/donmccurdy/glTF-Transform/tree/master/packages/extensions/src/khr-materials-clearcoat)*

The `KHR_materials_clearcoat` extension defines a clear coating that can be layered on top of an
existing glTF material definition. A clear coat is a common technique used in Physically-Based
Rendering to represent a protective layer applied to a base material.

The `MaterialsClearcoat` class provides a single {@link ExtensionProperty} type, `Clearcoat`, which
may be attached to any {@link Material} instance. For example:

```typescript
import { MaterialsClearcoat, Clearcoat } from '@gltf-transform/extensions';

// Create an Extension attached to the Document.
const clearcoatExtension = document.createExtension(MaterialsClearcoat);

// Create a Clearcoat property.
const clearcoat = clearcoatExtension.createClearcoat()
  .setClearcoatFactor(1.0);

// Attach the property to a material.
material.setExtension(Clearcoat, clearcoat);
```

### KHR_materials_unlit

- *Specification: [KHR_materials_unlit](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_materials_unlit/)*
- *Source: [packages/extensions/src/khr-materials-unlit/](https://github.com/donmccurdy/glTF-Transform/tree/master/packages/extensions/src/khr-materials-unlit)*

The `KHR_materials_unlit` extension defines an unlit shading model for use in glTF 2.0 materials,
as an alternative to the Physically Based Rendering (PBR) shading models provided by the core
specification.

The `MaterialsUnlit` class provides a single {@link ExtensionProperty} type, `Unlit`, which may be
attached to any {@link Material} instance. For example:

```typescript
import { MaterialsUnlit, Unlit } from '@gltf-transform/extensions';

// Create an Extension attached to the Document.
const unlitExtension = document.createExtension(MaterialsUnlit);

// Create an Unlit property.
const unlit = unlitExtension.createUnlit();

// Attach the property to a material.
material.setExtension(Unlit, unlit);
```

### KHR_mesh_quantization

- *Specification: [KHR_mesh_quantization](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_mesh_quantization/)*
- *Source: [packages/extensions/src/khr-mesh-quantization/](https://github.com/donmccurdy/glTF-Transform/tree/master/packages/extensions/src/khr-mesh-quantization)*

The `KHR_mesh_quantization` extension expands the set of allowed component types for mesh attribute
storage to provide a memory/precision tradeoff — depending on the application needs, 16-bit or
8-bit storage can be sufficient.

Defining no {@link ExtensionProperty} types, this {@link Extension} is simply attached to the
{@link Document}, and affects the entire Document by allowing more flexible use of {@link Accessor}
types for vertex attributes. Without the Extension, the same use of these data types would yield
an invalid glTF document, under the stricter core glTF specification.

```typescript
import { MeshQuantization } from '@gltf-transform/extensions';

// Create an Extension attached to the Document.
const quantizationExtension = document.createExtension(MeshQuantization).setRequired(true);
```

### KHR_texture_basisu <mark>*(experimental)*</mark>

- *Draft specification: [KHR_texture_basisu](https://github.com/KhronosGroup/glTF/pull/1751)*
- *Source: [packages/extensions/src/khr-texture-basisu/](https://github.com/donmccurdy/glTF-Transform/tree/master/packages/extensions/src/khr-texture-basisu)*

The `KHR_texture_basisu` extension adds the ability to use KTX2 GPU textures with Basis Universal
supercompression for any material texture. GPU texture formats, unlike traditional image formats,
remain compressed in GPU memory. As a result, they (1) upload to the GPU much more quickly, and (2)
require much less GPU memory. In certain cases they may also have smaller filesizes than PNG or
JPEG textures, but this is not guaranteed. GPU textures often require more careful tuning during
compression to maintain image quality, but this extra effort is worthwhile for applications that
need to maintain a smooth framerate while uploading images, or where GPU memory is limited.

Defining no {@link ExtensionProperty} types, this {@link Extension} is simply attached to the
{@link Document}, and affects the entire Document by allowing use of the `image/ktx2` MIME type
and passing KTX2 image data to the {@link Texture.setImage} method. Without the Extension, the
same MIME types and image data would yield an invalid glTF document, under the stricter core glTF
specification.

```typescript
import { TextureBasisu } from '@gltf-transform/extensions';

// Create an Extension attached to the Document.
const basisuExtension = document.createExtension(TextureBasisu)
  .setRequired(true);
document.createTexture('MyCompressedTexture')
  .setMimeType('image/ktx2')
  .setImage(fs.readFileSync('my-texture.ktx2'));
```

Compression is not done automatically when adding the extension as shown above — you must compress
the image data first, then pass the `.ktx2` payload to {@link Texture.setImage}. The [glTF-Transform
CLI](/cli.html) has functions to help with this, or any similar KTX2-capable utility will work.

When the `KHR_texture_basisu` extension is added to a file by glTF-Transform, the extension should
always be required. This tool does not support writing assets that "fall back" to optional PNG or
JPEG image data.

> **NOTICE:** The `KHR_texture_basisu` extension is still a draft specification, and may change
before being officially ratified. Some aspects are still being worked out — in particular, naively
compressing a 3-component (RGB) normal map will often give poor results with the ETC1S compression
option.
