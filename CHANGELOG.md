# Changelog

## v4.x

### v4.0

**Breaking changes:**

- core: Renames `NodeIO#setAllowHttp` to `setAllowNetwork` [#1392](https://github.com/donmccurdy/glTF-Transform/pull/1392)
- core: Removes `Document#merge` and `Document#clone` methods [#1375](https://github.com/donmccurdy/glTF-Transform/pull/1375)
	- Use `mergeDocuments` and `cloneDocument` from `/functions` package
- core: Renames `bounds` to `getBounds` and moves from /core to /functions [#1340](https://github.com/donmccurdy/glTF-Transform/pull/1340)
- core: Renames `Node#getParent` to `Node#getParentNode` and `Node#listNodeScenes` [#1211](https://github.com/donmccurdy/glTF-Transform/pull/1211)
- core: Renames `MathUtils#denormalize` to `decodeNormalizedInt`, and `MathUtils#normalize` to `encodeNormalizedInt`  [#1211](https://github.com/donmccurdy/glTF-Transform/pull/1211)
- core,extensions: Removes hexadecimal getters/setters [#1211](https://github.com/donmccurdy/glTF-Transform/pull/1211)
	- Use [`ColorUtils`](https://gltf-transform.dev/modules/core/classes/ColorUtils) instead
- extensions: Upgrade to `property-graph` v2 [#1141](https://github.com/donmccurdy/glTF-Transform/pull/1141)
	- Affects implementations of custom extensions. See changes to official extensions in [#1141](https://github.com/donmccurdy/glTF-Transform/pull/1141)
- functions: Removes 'overwrite' and 'skipIndices' options from `transformMesh()` and `transformPrimitive()` functions [#1397](https://github.com/donmccurdy/glTF-Transform/pull/1397)
- functions: Removes lossy `weld()` options [#1357](https://github.com/donmccurdy/glTF-Transform/pull/1357)
- functions: Merges `textureResize` into `textureCompress` function [#1211](https://github.com/donmccurdy/glTF-Transform/pull/1211)
- cli: Update to Sharp v0.33 [#1402](https://github.com/donmccurdy/glTF-Transform/pull/1402)
	- See [Sharp installation guide](https://sharp.pixelplumbing.com/install#cross-platform)
- cli: Upgrade to KTX-Software v4.3 [#1277](https://github.com/donmccurdy/glTF-Transform/pull/1277), [#1369](https://github.com/donmccurdy/glTF-Transform/pull/1369), [#1376](https://github.com/donmccurdy/glTF-Transform/pull/1376), [#1378](https://github.com/donmccurdy/glTF-Transform/pull/1378)
- cli: Renames `--allow-http` to `--allow-net` [#1392](https://github.com/donmccurdy/glTF-Transform/pull/1392)
- cli: Change default compression of `optimize` command to Meshopt [#1377](https://github.com/donmccurdy/glTF-Transform/pull/1377)
- core,cli: Requires Node.js >=18; other runtimes (Web and Deno) unaffected

**Features:**

- extensions: Adds `KHR_materials_diffuse_transmission` [#1159](https://github.com/donmccurdy/glTF-Transform/pull/1159)
- extensions: Adds `KHR_materials_dispersion` [#1262](https://github.com/donmccurdy/glTF-Transform/pull/1262)
- functions: Adds `mergeDocuments(target, source)` [#1375](https://github.com/donmccurdy/glTF-Transform/pull/1375)
- functions: Adds `cloneDocument(source)` [#1375](https://github.com/donmccurdy/glTF-Transform/pull/1375)
- functions: Adds `copyToDocument(target, source, sourceProperties)` [#1375](https://github.com/donmccurdy/glTF-Transform/pull/1375)
- functions: Adds `moveToDocument(target, source, sourceProperties)` [#1375](https://github.com/donmccurdy/glTF-Transform/pull/1375)
- functions: Adds `compactPrimitive()` to remove unused vertices [#1397](https://github.com/donmccurdy/glTF-Transform/pull/1397)
- functions: Adds `convertPrimitiveToLines` and `convertPrimitiveToTriangles`, support conversions of various primitive topologies to triangle lists and line lists [#1316](https://github.com/donmccurdy/glTF-Transform/pull/1316)
- functions: Adds more aggressive `prune()` defaults [#1199](https://github.com/donmccurdy/glTF-Transform/pull/1199), [#1270](https://github.com/donmccurdy/glTF-Transform/pull/1270)
- cli: Expose `--simplify-ratio` and `--simplify-lock-border` options on `optimize` command [#1354](https://github.com/donmccurdy/glTF-Transform/pull/1354) by [@jo-chemla](https://github.com/jo-chemla)
- cli: Expose prune-related options on `optimize` command [#1298](https://github.com/donmccurdy/glTF-Transform/pull/1298) by [@subho57](https://github.com/subho57)
- cli: MikkTSpace tangent calculation handles unwelding and welding automatically [#1241](https://github.com/donmccurdy/glTF-Transform/pull/1241)
- functions: Add vertex count helpers, `getSceneVertexCount`, `getNodeVertexCount`, `getMeshVertexCount`, `getPrimitiveVertexCount` [#1320](https://github.com/donmccurdy/glTF-Transform/pull/1320), [#1327](https://github.com/donmccurdy/glTF-Transform/pull/1327), [#1393](https://github.com/donmccurdy/glTF-Transform/pull/1393)
- functions: Add `keepExtras` option to `prune()` [#1302](https://github.com/donmccurdy/glTF-Transform/pull/1302) by [@Archimagus](https://github.com/Archimagus)
- functions: Add support for point cloud simplification, via meshoptimizer v0.20 [#1291](https://github.com/donmccurdy/glTF-Transform/pull/1291)
- functions: Add power-of-two options to `textureCompress` [#1221](https://github.com/donmccurdy/glTF-Transform/pull/1221)

**Performance:**

- functions: Improves `weld()` performance [#1237](https://github.com/donmccurdy/glTF-Transform/pull/1237), [#1238](https://github.com/donmccurdy/glTF-Transform/pull/1238), [#1344](https://github.com/donmccurdy/glTF-Transform/pull/1344), [#1351](https://github.com/donmccurdy/glTF-Transform/pull/1351)
- functions: Improves `join()` and `joinPrimitives()` performance [#1242](https://github.com/donmccurdy/glTF-Transform/pull/1242), [#1397](https://github.com/donmccurdy/glTF-Transform/pull/1397)
- functions: Improves `transformMesh()` `transformPrimitive()` performance [#1397](https://github.com/donmccurdy/glTF-Transform/pull/1397)
- functions: Improves `quantize()` performance [#1395](https://github.com/donmccurdy/glTF-Transform/pull/1395)
- functions: Improves `partition()` performance [#1373](https://github.com/donmccurdy/glTF-Transform/pull/1373)
- functions: Improves `reorder()` performance [#1358](https://github.com/donmccurdy/glTF-Transform/pull/1358)
- core: NodeIO now writes files to disk in batches [#1383](https://github.com/donmccurdy/glTF-Transform/pull/1383)
- functions: Improves `simplify()` performance on indexed primitives [#1381](https://github.com/donmccurdy/glTF-Transform/pull/1381)

**Other:**

- chore(repo): Update to Yarn v4 [#1401](https://github.com/donmccurdy/glTF-Transform/pull/1401)
- chore(repo): Adds CI for local builds on windows [#959](https://github.com/donmccurdy/glTF-Transform/pull/959)
- chore(repo): Add benchmarks
- chore(repo): Packages are now published as unminified code [#1212](https://github.com/donmccurdy/glTF-Transform/pull/1212)
- docs(core): Fix errors in Accessor documentation [#1235](https://github.com/donmccurdy/glTF-Transform/pull/1235) by [@harrycollin](https://github.com/harrycollin)
- docs(extensions): Add more illustrations for extensions
- docs(repo): Show 'experimental' tags in API documentation [`c3a693`](https://github.com/donmccurdy/glTF-Transform/commit/c3a693567157ed5c387eb5e7f6cb5a06a146d001)
- fix(core): Clamp when encoding normalized ints [#1286](https://github.com/donmccurdy/glTF-Transform/pull/1286)
- fix(extensions): Bug fixes for Draco compression [#1388](https://github.com/donmccurdy/glTF-Transform/pull/1388), [#1385](https://github.com/donmccurdy/glTF-Transform/pull/1385)
- fix(extensions): Group Meshopt-compressed accessors by parent [#1384](https://github.com/donmccurdy/glTF-Transform/pull/1384)
- fix(extensions): Improve order-independence in extension implementations [#1257](https://github.com/donmccurdy/glTF-Transform/pull/1257)
- fix(functions): Various fixes for pruning and welding [#1284](https://github.com/donmccurdy/glTF-Transform/pull/1284)
- fix(functions): Fixes for instancing bugs [#1269](https://github.com/donmccurdy/glTF-Transform/pull/1269)
- fix(functions): Fixes for simplification bugs [#1268](https://github.com/donmccurdy/glTF-Transform/pull/1268)
- fix(cli): Reformat 'validate' output as valid CSV [#1252](https://github.com/donmccurdy/glTF-Transform/pull/1252)

## v3.x

### v3.9 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/36))

**Features:**

- Update `prune()` to remove redundant mesh indices [#1164](https://github.com/donmccurdy/glTF-Transform/pull/1164)
- Update meshoptimizer to v0.20

### v3.8 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/35))

**Features:**

- Add quantization options in `meshopt()` function [#1144](https://github.com/donmccurdy/glTF-Transform/pull/1144)
- Improve encoding of morh normals with quantization and meshopt encoding [#1151](https://github.com/donmccurdy/glTF-Transform/pull/1151)

### v3.7 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/32))

**Features:**

- Reduced CLI initialization time [#1091](https://github.com/donmccurdy/glTF-Transform/pull/1091), [#1093](https://github.com/donmccurdy/glTF-Transform/pull/1093)
- Add `pruneSolidTextures` option to `prune()` [`be73c8`](https://github.com/donmccurdy/glTF-Transform/commit/c0bf86aedefe3795f145b86f590917eff2be73c8)

**Other:**

- Fix encoding of special characters in filenames when writing to disk [#1118](https://github.com/donmccurdy/glTF-Transform/pull/1118)
- Fixed regression in quality of Draco compression [#1077](https://github.com/donmccurdy/glTF-Transform/pull/1077)
- Updated `sharp` CLI dependency to address high-priority WebP vulnerability in libwebp
    - See [CVE-2023-4863](https://github.com/advisories/GHSA-j7hp-h8jx-5ppr) and [CVE-2023-41064](https://github.com/advisories/GHSA-8c6q-gxj3-w77f)

### v3.6 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/31))

**Features:**

- Add limited `textureCompress()` support in web browsers (PNG, JPEG, WebP) [#1075](https://github.com/donmccurdy/glTF-Transform/pull/1075)
- Bug fixes and quality improvements in `optimize()`, `dedup()`, `instance()`, `flatten()` and `join()` operations [#1073](https://github.com/donmccurdy/glTF-Transform/pull/1073)
- `textureCompress()` PNG compression is now lossless by default [#1068](https://github.com/donmccurdy/glTF-Transform/pull/1068)
- `join()` now supports quantized meshes [#1067](https://github.com/donmccurdy/glTF-Transform/pull/1067)
- `simplify()` now cleans up degenerate mesh primitives [#1066](https://github.com/donmccurdy/glTF-Transform/pull/1066)
- Moved CLI to a fork of Caporal.js [#1065](https://github.com/donmccurdy/glTF-Transform/pull/1065)

### v3.5 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/30))

**Features:**

- Improvements to `weld()` [#1029](https://github.com/donmccurdy/glTF-Transform/pull/1029) by [@rotu](https://github.com/rotu)
- Add `--pattern` flag in `etc1s` and `uastc` CLI commands [#1037](https://github.com/donmccurdy/glTF-Transform/pull/1037)
- Add `toleranceNormal` option in `weld()` [#1046](https://github.com/donmccurdy/glTF-Transform/pull/1046)
  - Default vertex normal tolerance has been reduced ([#1035](https://github.com/donmccurdy/glTF-Transform/pull/1035)), reducing loss of quality in some cases. Where more aggressive welding is required (such as simplification and LODs), users should specify `toleranceNormal=0.5` to restore the previous default.

### v3.4 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/29))

_Special thanks to [Muse](https://www.muse.place/) for supporting development of the `palette()` feature._

**Features:**

- Add `palette()` function [#952](https://github.com/donmccurdy/glTF-Transform/pull/952)
- Add "resize" option in `toktx()` [#968](https://github.com/donmccurdy/glTF-Transform/pull/968)

### v3.3 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/27))

_Special thanks to [@kzhsw](https://github.com/kzhsw) for help with performance improvements in v3.3._

**Features:**

- Add `listTextureInfoByMaterial()` function [#947](https://github.com/donmccurdy/glTF-Transform/pull/947)
- Add `getTextureColorSpace` function [#944](https://github.com/donmccurdy/glTF-Transform/pull/944)
- Sync with `KHR_materials_anisotropy` release candidate [#946](https://github.com/donmccurdy/glTF-Transform/pull/946)
- Improve performance of `dedup` [#945](https://github.com/donmccurdy/glTF-Transform/pull/945)
- Improve performance of `resample`, port to WASM [#934](https://github.com/donmccurdy/glTF-Transform/pull/934)

**Internal:**

- Migrate documentation from TypeDoc to [Greendoc](https://github.com/donmccurdy/greendoc) [#940](https://github.com/donmccurdy/glTF-Transform/pull/940)
- Update to TypeScript v5

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
- Add getter/setter for default [Scene](https://gltf-transform.dev/classes/root.html) on [Root](https://gltf-transform.dev/classes/root.html). [#202](https://github.com/donmccurdy/glTF-Transform/pull/202)

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

- getExtension/setExtension syntax changed to accept extension names, not constructors. See [ExtensibleProperty](https://gltf-transform.dev/classes/extensibleproperty.html).
- Scene addNode/removeNode/listNodes are now addChild/removeChild/listChildren, for consistency with Node API.

### v0.5 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/5))

### v0.4 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/4))

### v0.2 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/2))

### v0.1 ([Milestone](https://github.com/donmccurdy/glTF-Transform/milestone/1))
