# Changelog

## v3.x

<!-- ### v3.3 — 🚧 Unreleased -->

### v3.2 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/25))

**Features:**

- Improve `optimize` and `simplify()` defaults [#901](https://github.com/donmccurdy/glTF-Transform/pull/901)
- Rename colorspace() to vertexColorSpace() [#899](https://github.com/donmccurdy/glTF-Transform/pull/899)

### v3.1 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/24))

**Features:**

- Add `--join <bool>` and `--flatten <bool>` flags to `optimize' CLI command [#838](https://github.com/donmccurdy/glTF-Transform/pull/838) by [@xlsfs](https://github.com/xlsfs)
- Add `KHR_materials_anisotropy` extension [#748](https://github.com/donmccurdy/glTF-Transform/pull/748)
- Allow root Nodes to be shared by multiple Scenes [#833](https://github.com/donmccurdy/glTF-Transform/pull/833)
  - Deprecate `Node#getParent()`, prefer `Node#getParentNode()`
  - Deprecate `getNodeScene()`, prefer `listNodeScenes()`

### v3.0 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/19))

**Features:**

- Add `optimize` multi-command to CLI, "optimize all the things" [#819](https://github.com/donmccurdy/glTF-Transform/pull/819)
- Replace Squoosh with Sharp, new `textureCompress()` API [#752](https://github.com/donmccurdy/glTF-Transform/pull/752)
  - Add AVIF compression [#771](https://github.com/donmccurdy/glTF-Transform/pull/771)
  - Add quality, effort, and other compression settings [#816](https://github.com/donmccurdy/glTF-Transform/pull/816)
  - Improved texture resizing performance and stability on Node.js
- Add `flatten()` function, reduce scene graph nesting [#790](https://github.com/donmccurdy/glTF-Transform/pull/790)
- Add `join()` and `joinPrimitives()` functions, reduce draw calls [#707](https://github.com/donmccurdy/glTF-Transform/pull/707), [#658](https://github.com/donmccurdy/glTF-Transform/pull/658)
- Add support for sparse accessors [#793](https://github.com/donmccurdy/glTF-Transform/pull/793)
- Add `--format` option to CLI `validate` command [#778](https://github.com/donmccurdy/glTF-Transform/pull/778)
- NodeIO creates missing directories when writing .gltf resources [#779](https://github.com/donmccurdy/glTF-Transform/pull/779)
- Add `clearNodeParent()`, `clearNodeTransform()`, `getNodeScene()` [#784](https://github.com/donmccurdy/glTF-Transform/pull/784)
- (EXPERIMENTAL) Add `--config` flag to CLI, support userland extensions and commands [#791](https://github.com/donmccurdy/glTF-Transform/pull/791)

**Breaking changes:**

- Rename extension classes, include vendor prefixes [#776](https://github.com/donmccurdy/glTF-Transform/pull/776)
- Rename `bounds()` → `getBounds()` [#774](https://github.com/donmccurdy/glTF-Transform/pull/774)
- Rename MathUtils `normalize()` / `denormalize()` → `encodeNormalizedInt()` / `decodeNormalizedInt()` [#777](https://github.com/donmccurdy/glTF-Transform/pull/777)
- Rename ImageUtils `getMemSize()` → `getVRAMByteLength()` [#812](https://github.com/donmccurdy/glTF-Transform/pull/812)
- Replace Squoosh with Sharp, new `textureCompress()` API [#752](https://github.com/donmccurdy/glTF-Transform/pull/752)
- Update signatures of `listTextureChannels`, `listTextureInfo`, `listTextureSlots`, and `getTextureChannelMask` to not require `document` parameter [#787](https://github.com/donmccurdy/glTF-Transform/pull/787)
- Store array literals (color, vector, ...) as copies [#796](https://github.com/donmccurdy/glTF-Transform/pull/796)

**Internal:**

- Migrate unit tests to Ava [#799](https://github.com/donmccurdy/glTF-Transform/pull/799)
- Upgrade /cli package to pure ESM [#798](https://github.com/donmccurdy/glTF-Transform/pull/798)

## v2.x

### v2.5 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/23))

**Features:**

- Add `weldPrimitive(document, prim, options)` function [#767](https://github.com/donmccurdy/glTF-Transform/pull/767) by [@marwie](https://github.com/marwie)
- Support resampling quaternion keyframe tracks in `resample()` [#760](https://github.com/donmccurdy/glTF-Transform/pull/760)
- Remove unused vertex attributes in `prune()` [#759](https://github.com/donmccurdy/glTF-Transform/pull/759)
- Display KTX2 compression type in `inspect()` report [#757](https://github.com/donmccurdy/glTF-Transform/pull/757)
- Add morph target support in `transformMesh()`, `transformPrimitive()` [#756](https://github.com/donmccurdy/glTF-Transform/pull/756)
- Improve detection of duplicate meshes in `dedup()` [#663](https://github.com/donmccurdy/glTF-Transform/pull/663) by [@robertlong](https://github.com/robertlong)

### v2.4 — ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/22))

**Features:**

- Add `sortPrimitiveWeights(prim, limit)` function [#670](https://github.com/donmccurdy/glTF-Transform/pull/670)
- Add `listTextureInfo(texture)` function [#692](https://github.com/donmccurdy/glTF-Transform/pull/692)
- Add `transformMesh(mesh, matrix)` and `transformPrimitive(prim, matrix)` functions [#657](https://github.com/donmccurdy/glTF-Transform/pull/657)
- Rewrite `weld()` function, improving weld results [#661](https://github.com/donmccurdy/glTF-Transform/pull/661)
- Handle conflicting URLs during merge [#677](https://github.com/donmccurdy/glTF-Transform/pull/677)
- Add documentation for writing custom extensions [#678](https://github.com/donmccurdy/glTF-Transform/pull/678)

### v2.3 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/21))

**Features:**

- Add `simplify()` function. [#655](https://github.com/donmccurdy/glTF-Transform/pull/655)
- Add `ILogger` interface for user-specified logging. [#653](https://github.com/donmccurdy/glTF-Transform/pull/653)
- Add support for `.extras`  on TextureInfo. [#646](https://github.com/donmccurdy/glTF-Transform/pull/646)
- Show normalized attributes in `inspect()` output. [#638](https://github.com/donmccurdy/glTF-Transform/pull/638)

### v2.2 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/20))

**Features:**

- ~~Changed `package.json#module` entrypoint extension to `.mjs` [#619](https://github.com/donmccurdy/glTF-Transform/pull/619)~~
- Add 'slots' option to `textureResize()` function. [#622](https://github.com/donmccurdy/glTF-Transform/pull/622) by [@snagy](https://github.com/snagy)

### v2.1 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/18))

**Features:**

- Vastly improved KTX compression speed. [#389](https://github.com/donmccurdy/glTF-Transform/pull/389) by [@mikejurka](https://github.com/mikejurka), [@spatialsys](https://github.com/spatialsys)
- Add `KHR_materials_iridescence` extension. [#518](https://github.com/donmccurdy/glTF-Transform/pull/518)
- Add WebP, OxiPNG, and MozJPEG image optimization with [`@squoosh/lib`](https://www.npmjs.com/package/@squoosh/lib). [#506](https://github.com/donmccurdy/glTF-Transform/pull/506)
- Add `draco()`, `meshopt()`, `unlit()`, and `ktxfix()` functions to `@gltf-transform/functions` (moved from CLI). [#544](https://github.com/donmccurdy/glTF-Transform/issues/544)
- Add `listTextureSlots()`, `listTextureChannels()`, `getTextureChannelMask()`. [#506](https://github.com/donmccurdy/glTF-Transform/pull/506)

### v2.0 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/17))

**Features:**

- Improved and simplified extension API. [#437](https://github.com/donmccurdy/glTF-Transform/pull/437)
- Add `a.equals(b)` method for all property types. [#437](https://github.com/donmccurdy/glTF-Transform/pull/437)
- Add `KHR_xmp_json_ld` extension. [#468](https://github.com/donmccurdy/glTF-Transform/pull/468)
- Add `NodeIO.setAllowHTTP(<boolean>)`. [#466](https://github.com/donmccurdy/glTF-Transform/pull/466)
- Non-blocking NodeIO read/write. [#441](https://github.com/donmccurdy/glTF-Transform/pull/441)
- Add `DenoIO` (experimental). [#380](https://github.com/donmccurdy/glTF-Transform/pull/380)
- Add `normals()` function. [#497](https://github.com/donmccurdy/glTF-Transform/pull/497)

**Breaking changes:**

- API for custom extensions updated. [#437](https://github.com/donmccurdy/glTF-Transform/pull/437)
- I/O, Texture and other classes use Uint8Array for binary data, not ArrayBuffer. [#447](https://github.com/donmccurdy/glTF-Transform/pull/447)
- I/O read/write methods are now asynchronous. [#441](https://github.com/donmccurdy/glTF-Transform/pull/441)
- Removed support for Node.js ≤ 12.x

## v1.x

### v1.2 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/15))

**Features:**

- Add `dequantize()` function. [#431](https://github.com/donmccurdy/glTF-Transform/pull/431)
- Add `KHR_materials_emissive_strength` extension. [#422](https://github.com/donmccurdy/glTF-Transform/pull/422)
- Add `ImageUtils.getMimeType(buffer)`. [#432](https://github.com/donmccurdy/glTF-Transform/pull/432)

### v1.1 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/14))

**Features:**

- Extensions registered with I/O are written if used; unregistered extensions are skipped. [#421](https://github.com/donmccurdy/glTF-Transform/pull/421)
- Stages in `document.transform()` can detect other stages and optimize accordingly. [#417](https://github.com/donmccurdy/glTF-Transform/pull/417)
- Added `material.equals(otherMaterial)` method. [#405](https://github.com/donmccurdy/glTF-Transform/pull/405) by [@MrMagicPenguin](https://github.com/MrMagicPenguin)
- Added support for materials in `dedup()` function. [#407](https://github.com/donmccurdy/glTF-Transform/pull/407) by [@MrMagicPenguin](https://github.com/MrMagicPenguin)

### v1.0 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/13))

*Stable release.*

## v0.x

### v0.12 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/12))

**Features:**

- Add compression/decompression support for `EXT_meshopt_compression`. [#314](https://github.com/donmccurdy/glTF-Transform/pull/314) [#323](https://github.com/donmccurdy/glTF-Transform/pull/323)
- Add `reorder()` function. [#321](https://github.com/donmccurdy/glTF-Transform/pull/321)
- Faster, smaller CLI installation. [#281](https://github.com/donmccurdy/glTF-Transform/pull/281)
- Improved `textureResize()` API. [#282](https://github.com/donmccurdy/glTF-Transform/pull/282)
- Add `node.setMatrix(...)`. [#270](https://github.com/donmccurdy/glTF-Transform/issues/270)
- Parse in-memory Data URIs with `readJSON`. [#266](https://github.com/donmccurdy/glTF-Transform/pull/266)
- Support `.extras` on Root object [#339](https://github.com/donmccurdy/glTF-Transform/pull/339)

**Breaking changes:**

- Remove ao() function and dependencies. [#281](https://github.com/donmccurdy/glTF-Transform/pull/281)

### v0.11 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/11))

**Features:**

- Add `textureResize()` function. [#267](https://github.com/donmccurdy/glTF-Transform/pull/267)
- Add `quantizationVolume: 'scene' | 'mesh'` option to `quantize()` and Draco compression. Fixes [#257](https://github.com/donmccurdy/glTF-Transform/issues/257). [#272](https://github.com/donmccurdy/glTF-Transform/pull/272)
- Support GLB files without binary data (e.g. just a node graph). [#245](https://github.com/donmccurdy/glTF-Transform/pull/245)
- Improve type-checking throughout the library, with [TypeScript's strict checks](https://www.typescriptlang.org/tsconfig#strict).
- Add API documentation for `@gltf-transform/extensions` and `@gltf-transform/functions`, with [Typedoc](https://github.com/TypeStrong/typedoc) v0.20.

**Breaking changes:**

- Rename `@gltf-transform/lib` to `@gltf-transform/functions`. [#249](https://github.com/donmccurdy/glTF-Transform/pull/249)
- Move `ao()` from `@gltf-transform/functions` to the CLI, cutting size and dependencies of the functions package.
- I/O `writeJSON` option `isGLB: true` changed to `format: Format.GLB`.

### v0.10 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/10))

**Features:**

- Add 'ktxfix' command in CLI. [#222](https://github.com/donmccurdy/glTF-Transform/pull/222)
- Add getter/setter for default [Scene](https://gltf-transform.donmccurdy.com/classes/root.html) on [Root](https://gltf-transform.donmccurdy.com/classes/root.html). [#202](https://github.com/donmccurdy/glTF-Transform/pull/202)

**Breaking changes:**

- Material extensions now track RGBA channel usage of each texture, allowing improvements in KTX 2.0 support. [#221](https://github.com/donmccurdy/glTF-Transform/pull/221)

### v0.9 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/9))

**Features:**

- Add 'instance' transform. [#169](https://github.com/donmccurdy/glTF-Transform/pull/169)
- Add 'prune' transform. [#162](https://github.com/donmccurdy/glTF-Transform/pull/162)
- Add 'resample' transform. [#158](https://github.com/donmccurdy/glTF-Transform/pull/158)
- Add 'tangents' transform. [#175](https://github.com/donmccurdy/glTF-Transform/pull/175)
- Add 'quantize' transform. [#59](https://github.com/donmccurdy/glTF-Transform/pull/59)
- Add `KHR_materials_volume` extension. [#161](https://github.com/donmccurdy/glTF-Transform/pull/161)
- Add `EXT_mesh_gpu_instancing` extension. [#115](https://github.com/donmccurdy/glTF-Transform/pull/115)
- Add `--format={pretty,csv,md}` output options for CLI `inspect` command.
- Add `--vertex-layout={interleaved,separate}` options for CLI output.

**Breaking changes:**

- Stricter type checking.
- Enum values moved from `GLTF.*` to static properties of the relevant class. Primitive enum values are now allowed.
- Enable esModuleInterop in TS config.
- 'dedup' transform takes a `propertyTypes: string[]` array, rather than boolean flags for each property type.
- 'draco' CLI command options renamed (hyphenated) for consistency.

### v0.8 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/8))

**Features:**

- Add 'weld' and 'unweld' transforms.
- Add encoding/compression support for `KHR_draco_mesh_compression`.
- Add KTX and WebP support in utils and 'inspect' function.
- Add `KHR_materials_variants` extension.

**Breaking changes:**

- Stricter type checking.
- External type definitions are now installed as dependencies.

### v0.7 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/7))

**Features:**

- Add 'center' and 'sequence' transforms.
- Add 'bounds' helper.
- Enhance 'partition' transform to support animations.
- Add `KHR_draco_mesh_compression` extension (decode only).
- Add `KHR_texture_transform` extension.
- Add `EXT_texture_webp` extension.
- Add `KHR_materials_sheen` extension.

**Breaking changes:**

- Merged TextureSampler properties into TextureInfo.
- TextureInfo now extends from ExtensibleProperty.
- Simplified I/O API. Renamed:
  - NativeDocument -> JSONDocument
  - unpackGLB -> readBinary
  - packGLB -> writeBinary
  - createDocument -> readJSON
  - createNativeDocument -> writeJSON
  - unpackGLBToNativeDocument -> binaryToJSON

### v0.6 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/6))

**Features:**

- Add world transform API (getWorldTranslation/getWorldRotation/getWorldScale/getWorldMatrix) and getMatrix to Node.
- Add ColorUtils and helper methods to work with colors in hexadecimal and sRGB.
- Add traverse method to Node.
- Simplified Extension API.
- Add Extras API.

**CLI:**

- Accept textures in `merge` command.

**Breaking changes:**

- getExtension/setExtension syntax changed to accept extension names, not constructors. See [ExtensibleProperty](https://gltf-transform.donmccurdy.com/classes/extensibleproperty.html).
- Scene addNode/removeNode/listNodes are now addChild/removeChild/listChildren, for consistency with Node API.

### v0.5 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/5))

### v0.4 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/4))

### v0.2 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/2))

### v0.1 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/1))
