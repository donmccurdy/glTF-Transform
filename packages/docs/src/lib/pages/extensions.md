---
title: Extensions | glTF Transform
snippet: Extensions enhance a glTF Document with additional features and schema, beyond the core glTF specification. For example, extensions to…
---


# Extensions

Extensions enhance a glTF [Document](/modules/core/classes/Document) with additional features and schema, beyond the core
glTF specification. For example, extensions to [Material](/modules/core/classes/Material) properties might include additional
textures or scalar properties affecting the Material's appearance in a specific way.

Common extensions may be imported from the `@gltf-transform/extensions` package, or custom
extensions may be created by extending the [Extension](/modules/core/classes/Extension) base class. No extensions are included
in the default `@gltf-transform/core` package, in order to (1) minimize the code size, and (2)
ensure that any extension can be implemented externally.

Because extensions rely on the same underlying graph structure as the core specification,
references to [Texture](/modules/core/classes/Texture), [Accessor](/modules/core/classes/Accessor), and other resources will be managed
automatically, even by scripts or transforms written without prior knowledge of the extension.
An extension is added to a Document by calling [Document.createExtension](/modules/core/classes/Document#createExtension) with the
extension constructor. The extension object may then be used to construct
[ExtensionProperty](/modules/core/classes/ExtensionProperty) instances, which are attached to properties throughout the Document
as prescribed by the extension itself.

## Khronos Extensions

- [KHR_draco_mesh_compression](/modules/extensions/classes/KHRDracoMeshCompression)
- [KHR_lights_punctual](/modules/extensions/classes/KHRLightsPunctual)
- [KHR_materials_anisotropy](/modules/extensions/classes/KHRMaterialsAnisotropy)
- [KHR_materials_clearcoat](/modules/extensions/classes/KHRMaterialsClearcoat)
- [KHR_materials_diffuse_transmission](/modules/extensions/classes/KHRMaterialsDiffuseTransmission) *(🧪 experimental)*
- [KHR_materials_dispersion](/modules/extensions/classes/KHRMaterialsDispersion)
- [KHR_materials_emissive_strength](/modules/extensions/classes/KHRMaterialsEmissiveStrength)
- [KHR_materials_ior](/modules/extensions/classes/KHRMaterialsIOR)
- [KHR_materials_iridescence](/modules/extensions/classes/KHRMaterialsIridescence)
- [KHR_materials_pbrSpecularGlossiness](/modules/extensions/classes/KHRMaterialsPBRSpecularGlossiness)
- [KHR_materials_sheen](/modules/extensions/classes/KHRMaterialsSheen)
- [KHR_materials_specular](/modules/extensions/classes/KHRMaterialsSpecular)
- [KHR_materials_transmission](/modules/extensions/classes/KHRMaterialsTransmission)
- [KHR_materials_unlit](/modules/extensions/classes/KHRMaterialsUnlit)
- [KHR_materials_variants](/modules/extensions/classes/KHRMaterialsVariants)
- [KHR_materials_volume](/modules/extensions/classes/KHRMaterialsVolume)
- [KHR_mesh_quantization](/modules/extensions/classes/KHRMeshQuantization)
- [KHR_texture_basisu](/modules/extensions/classes/KHRTextureBasisu)
- [KHR_texture_transform](/modules/extensions/classes/KHRTextureTransform)
- [KHR_xmp_json_ld](/modules/extensions/classes/KHRXMP)

## Vendor Extensions

- [EXT_texture_avif](/modules/extensions/classes/EXTTextureAVIF)
- [EXT_texture_webp](/modules/extensions/classes/EXTTextureWebP)
- [EXT_mesh_gpu_instancing](/modules/extensions/classes/EXTMeshGPUInstancing)
- [EXT_meshopt_compression](/modules/extensions/classes/EXTMeshoptCompression)

## Installation

To use extensions, first install the `@gltf-transform/extensions` package:

```bash
npm install --save @gltf-transform/extensions
```

To open files containing an [Extension](/modules/core/classes/Extension), the Extension constructor must be registered with
the [PlatformIO](/modules/core/classes/PlatformIO) instance used to read the file.

```typescript
// Register all Khronos Group (KHR_) extensions.
import { WebIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
const io = new WebIO().registerExtensions(KHRONOS_EXTENSIONS);

// Register an individual extension.
import { WebIO } from '@gltf-transform/core';
import { KHRMaterialsUnlit } from '@gltf-transform/extensions';
const io = new WebIO().registerExtensions([KHRMaterialsUnlit]);

// Read a file that requires the KHR_materials_unlit extension.
const document = await io.readGLB('unlit.glb');
```

Reading or writing files requires registering the necessary Extensions with the I/O class. Some
extensions may require installing dependencies:

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

const document = await io.read('compressed.glb');
```

## Custom extensions

In addition to the official Khronos and multi-vendor extensions, the glTF format can be extended
with [custom extensions](https://github.com/KhronosGroup/gltf/blob/main/extensions/README.md)
for specific applications. glTF Transform supports reading/writing custom extensions, without
modifications to the core codebase. Any extension implemented correctly and registered with the I/O
instance may be read from a file, modified programmatically, and written back to a file.

For implementation examples, see [packages/extensions](https://github.com/donmccurdy/glTF-Transform/tree/master/packages/extensions).
For further details on the general Extension API, see [Extension](/modules/core/classes/Extension) and
[ExtensionProperty](/modules/core/classes/ExtensionProperty). Custom extensions can be registered
locally with the `@gltf-transform/cli` package using [custom CLI configuration](/cli-configuration).

### Writing a custom extension

Custom extensions must define a [Extension](/modules/core/classes/Extension) subclass, optionally implementing read/write operations. By convention, the name of this class is an uppercase adaptation of the full extension name, e.g. `ACME_particle_emitter` → ParticleEmitter. Authors of custom extensions are encouraged to follow the Khronos [extension naming guidelines](https://github.com/KhronosGroup/glTF/tree/main/extensions#naming), and to [reserve a prefix](https://github.com/KhronosGroup/glTF/blob/main/extensions/Prefixes.md) if necessary. However, glTF Transform's implementation does not depend on any particular naming rules for classes or extensions.

```javascript
class ParticleEmitter extends Extension {
	extensionName = 'ACME_particle_emitter';
	static EXTENSION_NAME = 'ACME_particle_emitter';

	/** Creates a new Emitter property, for use on a Node. */
	createEmitter(name = '') {
		return new Emitter(this.document.getGraph(), name);
	}

	/** See https://github.com/donmccurdy/glTF-Transform/blob/main/packages/core/src/io/reader-context.ts */
	read(context) {
		throw new Error('ACME_particle_emitter: read() not implemented');
	}

	/** See https://github.com/donmccurdy/glTF-Transform/blob/main/packages/core/src/io/writer-context.ts */
	write(context) {
		throw new Error('ACME_particle_emitter: write() not implemented');
	}
}
```

Both `read()` and `write()` must be implemented in order to support round-trip processing of glTF files relying on the extension; otherwise they can be left stubbed. Refer to the implementations of existing extensions, and to the [`ReaderContext`](https://github.com/donmccurdy/glTF-Transform/blob/main/packages/core/src/io/reader-context.ts) and [`WriterContext`](https://github.com/donmccurdy/glTF-Transform/blob/main/packages/core/src/io/writer-context.ts) structures, for examples implementing read/write operations in similar extensions.

By defining an Extension implementation, we've ensured that the `ACME_particle_emitter` extension will be added to `extensionsUsed` and (optionally) `extensionsRequired` in an output glTF file. Most extensions also define one or more properties within the file. To define those properties, we'll create subclasses of the [ExtensionProperty](/modules/core/classes/ExtensionProperty) class. These properties can be attached to other glTF properties like [Node](/modules/core/classes/Node) or [Material](/modules/core/classes/Material) instances, modifying their behavior. Alternatively, custom properties may be stored at the [Document](/modules/core/classes/Document) level, without being referenced by anything in the scene.

```javascript
class Emitter extends ExtensionProperty {
	static EXTENSION_NAME = 'ACME_particle_emitter';

	init() {
		this.extensionName = 'ACME_particle_emitter';
		this.propertyType = 'Emitter';
		this.parentTypes = [PropertyType.NODE];
	}

	getDefaults() {
		return Object.assign(super.getDefaults(), {
			minVelocity: [1, 1, 1],
			maxVelocity: [10, 10, 10],
			meshes: []
		});
	}

	// minVelocity
	getMinVelocity() {
		return this.get('minVelocity');
	}
	setMinVelocity(velocity) {
		return this.set('minVelocity', velocity);
	}

	// maxVelocity
	getMaxVelocity() {
		return this.get('maxVelocity');
	}
	setMaxVelocity(velocity) {
		return this.set('maxVelocity', velocity);
	}

	// meshes
	listMeshes() {
		return this.listRefs('meshes');
	}
	addMesh(mesh) {
		return this.addRef('meshes', mesh);
	}
	removeMesh(mesh) {
		return this.removeRef('meshes', mesh);
	}
}
```

Internal methods `.get`, `.set`, `.listRefs`, etc. are defined by the [`property-graph`](https://www.npmjs.com/package/property-graph) package, with optional TypeScript support available. Custom extensions may customize their public APIs as needed. Exhaustive getters and setters are not required, as long as all references are internally routed through the `property-graph` APIs. This internal graph ensures that glTF Transform operations respect extensions' use of resources like Textures and Accessors, and detect when resources are used or unused.

Because we've defined `this.parentTypes = [PropertyType.NODE];` above, the operation will fail if the end-user attempts to attach the ExtensionProperty to another parent type, such as a Texture. Multiple parent types may be defined. For resources never referenced by other glTF properties, `parentTypes` may be left empty.

All ExtensionProperty instances associated with an Extension are available to that Extension as `this.properties`, for I/O. After defining an extension, you'll want to register it with the I/O class before reading or writing glTF assets:

```javascript
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';

const io = new NodeIO()
	.registerExtensions([...KHRONOS_EXTENSIONS, ParticleEmitter]);

const document = await io.read('path/to/model.glb');
```

Or, add the extension to an existing Document:

```javascript
const emitterExtension = document.createExtension(ParticleEmitter);
const emitter = emitterExtension.createEmitter('MyEmitter');
node.setExtension('ACME_particle_emitter', emitter);
```
