# v2 Scratchpad

## Ideas

Would it be completely crazy to have a web editor (https://microsoft.github.io/monaco-editor/index.html)
with TS autocomplete, where you can drag in a glTF file, script against it, and preview the results?

## Construction

Factory methods on container.

container.getRoot()
    .createScene('main')
    .createScene('alt')
    .listMeshes()
    .forEach((mesh) => ...)

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