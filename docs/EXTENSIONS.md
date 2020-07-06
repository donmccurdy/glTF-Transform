# Extensions

## Supported extensions

- [KHR_materials_unlit](#khr_materials_unlit)
- [KHR_mesh_quantization](#khr_mesh_quantization)

## Installation

To limit the size of the core package, and to ensure compatibility with [custom glTF vendor extensions](https://github.com/KhronosGroup/glTF/blob/master/extensions/README.md), no extensions — even official Khronos Group extensions — are included in `@gltf-transform/core`. However, implementations of some common Khronos (`KHR_`) or multi-vendor (`EXT_`) extensions are provided in the `@gltf-transform/extensions` package separately. To install them, first install that package:

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

When generating a glTF {@link Document} procedurally, without the use of an I/O class, import the
{@link Extension} constructor and pass it to the {@link Document.createExtension} factory method.

```typescript
import { Document } from '@gltf-transform/core';
import { MaterialsUnlit, Unlit } from '@gltf-transform/extensions';

// Create an empty Document, with two materials.
const doc = new Document();
const mat1 = doc.createMaterial('MyPBRMaterial');
const mat2 = doc.createMaterial('MyUnlitMaterial');

// Create a MaterialsUnlit Extension instance attached to the Document.
const unlitExtension = doc.createExtension(MaterialsUnlit).setRequired(false);
```

The {@link Extension} instance is then used to construct {@link ExtensionProperty} instances
related to that Extension. Some Extensions, like `KHR_mesh_quantization`, have no Properties and
simply have a holistic effect on the entire Document. Other Extensions may have multiple types of
Properties.

```typescript
// Attach an Unlit ExtensionProperty to a material.
const unlit = unlitExtension.createUnlit();
mat2.setExtension(Unlit, unlit);

// Remove the Unlit Property from the material.
unlit.dispose(); // Option 1.
mat2.setExtension(Unlit, null); // Option 2.
mat2.getExtension(Unlit).dispose(); // Option 3.

// Remove the KHR_materials_unlit extension from the Document, removing any attached properties
// in the process.
unlitExtension.dispose();
```

Use of the ExtensionProperty constructor in `getExtension` and `setExtension` methods is a
convenience for TypeScript users — the return type of the `getExtension` method can be
inferred automatically. Only one ExtensionProperty from a given Extension can be attached to any
given Property at a time. Properties may have ExtensionProperties from multiple Extensions
attached.

For further details on the general Extension API, see {@link Extension} and
{@link ExtensionProperty}.

## KHR_materials_unlit

*Specification: [KHR_materials_unlit](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_materials_unlit/)*

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

## KHR_mesh_quantization

*Specification: [KHR_mesh_quantization](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_mesh_quantization/)*

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
