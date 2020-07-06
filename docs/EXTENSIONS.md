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
for specific applications. glTF-Transform can be extended to support these custom extensions. A
simple example, allowing "Gizmo" resources to be attached to a {@link Node}, is shown below.

Gizmo extension implementation:

```typescript
// gizmo-extension.js
const { Document, Extension, ExtensionProperty, NodeIO, PropertyType } = require('../');

const EXTENSION_NAME = 'TEST_node_gizmo';

/**
 * Implementation of TEST_node_gizmo, enabling read/write when registered with I/O classes.
 */
class GizmoExtension extends Extension {
	constructor(doc) {
		super(doc);
		this.extensionName = EXTENSION_NAME;
	}

	createGizmo() {
		return new Gizmo(this.doc.getGraph(), this);
	}

	write(context) {
		for (const node of this.doc.getRoot().listNodes()) {
			if (node.getExtension(Gizmo)) {
				const nodeDef = context.nativeDocument.json.nodes[context.nodeIndexMap.get(node)];
				nodeDef.extensions = {TEST_node_gizmo: {isGizmo: true}};
			}
		}
	}

	read(context) {
		context.nativeDocument.json.nodes.forEach((nodeDef, index) => {
			const extensionDef = nodeDef.extensions && nodeDef.extensions.TEST_node_gizmo;
			if (!extensionDef || !extensionDef.isGizmo) return;
			const extension = this.doc.createExtension(GizmoExtension);
			context.nodes[index].setExtension(Gizmo, extension.createGizmo());
		});
	}
}

/**
 * Implementation of a Gizmo property, which can be attached to any Node. Often, an
 * ExtensionProperty may need to manage resources (Mesh, Texture, etc.) of its own.
 * See the `KHR_materials_clearcoat` implementation for an example of this.
 */
class Gizmo extends ExtensionProperty {
	constructor(graph, extension) {
		super(graph, extension);
		this.extensionName = EXTENSION_NAME;
		this.propertyType = 'Gizmo';
		this.parentTypes = [PropertyType.NODE];
	}
}
```

Usage:

 ```ts
// my-script.ts
import { Gizmo, GizmoExtension } from './gizmo-extension';

const gizmoExtension = doc.createExtension(GizmoExtension)
	.setRequired(true);

const gizmo = gizmoExtension.createGizmo();

node.setExtension(Gizmo, gizmo);
node.getExtension(Gizmo); // → gizmo
node.listExtensions(); // → [gizmo x1]
node.setExtension(Gizmo, null);
 ```

 For more examples, see [packages/extensions](https://github.com/donmccurdy/glTF-Transform/tree/master/packages/extensions).

## Supported extensions

- [KHR_materials_clearcoat](#khr_materials_clearcoat)
- [KHR_materials_unlit](#khr_materials_unlit)
- [KHR_mesh_quantization](#khr_mesh_quantization)
- [KHR_texture_basisu](#khr_texture_basisu)

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
