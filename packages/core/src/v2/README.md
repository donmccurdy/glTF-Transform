# v2 Scratchpad

## Ideas

Would it be completely crazy to have a web editor (https://microsoft.github.io/monaco-editor/index.html)
with TS autocomplete, where you can drag in a glTF file, script against it, and preview the results?

## Construction

Factory methods on container.

```ts
container.getRoot()
    .createScene('main')
    .createScene('alt')
    .listMeshes()
    .forEach((mesh) => ...)
```

## Writing

Textures ~= Image

```ts
TextureLink extends Link<Material, Texture> {
    private texCoord: number;
    private sampler: GLTF.ISampler = {};
    private transform = ...;
}
```

Advantages: The graph is relatively simple. Sharing textures is easy.
Disadvantages: How to provide access to that information?

```ts
// But this means you can't use the same texture for two things. Oops.
material.getTextureInfo(material.getBaseColorTexture())
    .setTexCoord(1);

// Ok, that's reasonable.
material.getBaseColorTextureInfo()
    .setTexCoord(1)
    .setMagFilter()
    .setMinFilter()
    .setWrapS(10497)
    .setWrapT(10497);
```

## Processing

```ts
const buffer = container
    .transform([
      ao({samples: 50}),
      prune({types: [Mesh]})
    ])
    .pack([
        interleave({multiple: false})
    ]);

```

Other thoughts:

- Skins are going to be a nightmare, per usual.
    - Node references Skin.
    - Skin references Node[].
    - Number of joints in Skin must match number of weights in Mesh.
        - This is probably just a validation step.
- 