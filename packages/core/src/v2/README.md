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
- We could, just as a convenience, include BufferView, Buffer, and Image
  types as Elements. These wouldn't necessarily hold data in the unpacked
  state: moving an accessor to another BufferView would _only_ change a
  link. But then the graph representation would look more like glTF, and
  it would be possible to visualize operations on these elements. This also
  means that some operations (`split()`, `interleave()`) potentially go from
  the `pack` stage to the `transform` stage, which is probably a good thing,
  because operations in the `pack` stage are subject to various conflicts.

```ts
// This has some real benefits.
accessor.bufferView: Link<Accessor, BufferView>;
bufferView.interleaved = true // 😱
bufferView.buffer: Link<BufferView, Buffer>;

// ... not sure what to do with this one.
// but, in fairness, my simpler current structure
// will have some trouble maintaining separate image
// fallbacks. I think I can live with that, though?
texture.image: Link<Texture, Image>;
```

## Editor domains

- ~~gltf.ist~~
- ~~gltf.gallery~~
- gltf.review (FBX Review)
- gltf.report
- gltf.info
- ~~gltf.help~~
- ~~gltf.guide~~
- gltf.stream
- gltf.tube
- gltf.tools
- gltf.build ($60!)
- gltf.studio
- gltf.software (KTX-Software)

- gltf.dev (taken!)
- gltf.app (taken!)
