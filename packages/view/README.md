# @gltf-transform/view

[![Latest NPM release](https://img.shields.io/npm/v/@gltf-transform/view.svg)](https://www.npmjs.com/package/@gltf-transform/view)
[![Minzipped size](https://badgen.net/bundlephobia/minzip/@gltf-transform/view)](https://bundlephobia.com/result?p=@gltf-transform/view)
[![License](https://img.shields.io/npm/l/@gltf-transform/view.svg)](https://github.com/donmccurdy/glTF-Transform/blob/main/packages/view/LICENSE.md)

> ⚠️ EXPERIMENTAL - The `@gltf-transform/view` module is currently experimental,
> and _does not follow semantic versioning_, unlike other packages in the
> project. Consider pinning the dependency to a specific version of the package.

Creates three.js objects from a glTF Transform [Document](https://gltf-transform.donmccurdy.com/classes/core.document.html), then keeps the three.js scene graph updated — in realtime ⚡️ — as changes are made to the Document. Combined with import/export using [WebIO](https://gltf-transform.donmccurdy.com/classes/core.platformio.html), `@gltf-transform/view` provides a lossless workflow to load, view, edit, and export glTF assets. It's meant for editor-like applications on the web. Unlike using [THREE.GLTFExporter](https://threejs.org/docs/index.html#examples/en/loaders/GLTFExporter), any glTF features that three.js doesn't support won't be lost, they just aren't rendered in the preview.

## Quickstart

Installation:

```
npm install --save @gltf-transform/view
```

## API

```typescript
import { Scene, WebGLRenderer, PerspectiveCamera } from 'three';
import { WebIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import { DocumentView } from '@gltf-transform/view';

// Set up three.js scene.

const scene = new Scene();
// ...

// Load glTF Document.
const io = new WebIO().registerExtensions(KHRONOS_EXTENSIONS);
const document = await io.read('path/to/input.glb');
const documentView = new DocumentView(document);

// Add glTF content to the scene (just once).
const sceneDef = document.getRoot().getDefaultScene(); // glTF Transform Scene
const group = documentView.view(sceneDef); // THREE.Group
scene.add(group);

// Render.
function animate () {
	requestAnimationFrame(animate);
	renderer.render(scene, camera);
}

// When glTF Document is edited, scene updates automatically.
const materialDef = document.getRoot().listMaterials()
	.find((mat) => mat.getName() === 'MyMaterial');
buttonEl.addEventListener('click', () => {
	materialDef.setBaseColorHex(0xFF0000);
});
```

Each DocumentView instance maintains reference counts and disposes of three.js WebGL resources (textures, geometry, materials) when the underlying glTF Transform properties are disposed. Unused resources are *not* disposed immediately, in case they might be used again later. To manually dispose of unused resources — e.g. to free up GPU memory — call  `documentView.gc()`. Resources will be re-allocated automatically if they are used again.

### Feature support

- ✅&nbsp;&nbsp;Renders and updates
- 🚧&nbsp;&nbsp;Static render, no updates
- ❌&nbsp;&nbsp;Not rendered

| binding       | status |
|---------------|--------|
| Scene         | ✅      |
| Node          | ✅      |
| Mesh          | ✅      |
| Primitive     | ✅      |
| Accessor      | ✅      |
| Material      | ✅      |
| Texture       | ✅      |
| Light         | ✅      |
| Skin          | ✅      |
| TextureInfo   | 🚧     |
| Morph Targets | ❌      |
| Animation     | ❌      |
| Camera        | ❌      |

For supported extensions, see [glTF-Transform-View#7](https://github.com/donmccurdy/glTF-Transform-View/issues/7).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

Published under [Blue Oak Model License 1.0.0](/LICENSE.md).
