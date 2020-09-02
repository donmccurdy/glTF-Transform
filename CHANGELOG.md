# Changelog

## v0.6 — 🚧 Unreleased

[Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/6)

**Features:**

- Add world transform API (getWorldTranslation/getWorldRotation/getWorldScale/getWorldMatrix) and getMatrix to Node.
- Add ColorUtils and helper methods to work with colors in hexadecimal and sRGB.
- Add traverse method to Node.
- Simplified Extension API.
- Add Extras API.

**Breaking changes:**

- getExtension/setExtension syntax changed to accept extension names, not constructors. See [ExtensibleProperty](https://gltf-transform.donmccurdy.com/classes/extensibleproperty.html).
- Scene addNode/removeNode/listNodes are now addChild/removeChild/listChildren, for consistency with Node API.

## v0.5

[Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/5)

## v0.4

[Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/4)

## v0.2

[Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/2)

## v0.1

[Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/1)
