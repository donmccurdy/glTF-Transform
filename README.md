🚨 Experimental

# glTF-Transform

![Status](https://img.shields.io/badge/status-experimental-orange.svg)
[![Latest NPM release](https://img.shields.io/npm/v/@gltf-transform/core.svg)](https://www.npmjs.com/package/@gltf-transform/core)
[![Minzipped size](https://badgen.net/bundlephobia/minzip/@gltf-transform/core)](https://bundlephobia.com/result?p=@gltf-transform/core)
[![License](https://img.shields.io/badge/license-MIT-007ec6.svg)](https://github.com/donmccurdy/glTF-Transform/blob/master/LICENSE)
[![Lerna](https://img.shields.io/badge/maintained%20with-lerna-007ec6.svg)](https://lerna.js.org/)
[![Build Status](https://travis-ci.com/donmccurdy/glTF-Transform.svg?branch=master)](https://travis-ci.com/donmccurdy/glTF-Transform)
[![Coverage Status](https://coveralls.io/repos/github/donmccurdy/glTF-Transform/badge.svg?branch=master)](https://coveralls.io/github/donmccurdy/glTF-Transform?branch=master)

glTF 2.0 SDK for JavaScript, TypeScript, and Node.js.

AGI's [glTF-Pipeline](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/) and
Microsoft's [glTF-Toolkit](https://github.com/Microsoft/glTF-Toolkit) are robust,
well-maintained tools for production workflows — I fully recommend using them for
the features the offer. However, neither covers the "long tail" of small, niche
changes to a glTF model: adjusting a material parameter, adding extensions, and so
on. For those situations, *this framework provides a better alternative to starting
from scratch, or modifying a library not designed with modularity in mind, for users
who need to write or reuse a custom transformation.*

glTF-Transform offers [CLI](#cli) and [programmatic](#programmatic) access to a library
of [packages](#packages), along with reusable utilities for extending the framework with
new features. Most packages work both in Node.js and on the web.

## Packages

| package                           | compatibility | description                                                                                                                                                                     |
|-----------------------------------|---------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [core](packages/core)             | Node.js, Web  | Core framework utilities.                                                                                                                                                       |
| [cli](packages/cli)               | Node.js       | Commandline interface to Node.js-compatible packages.                                                                                                                           |
| ---                               |               |                                                                                                                                                                                 |
| [ao](packages/ao)                 | Node.js, Web  | Bakes per-vertex ambient occlusion. Cheaper but lower-quality than AO baked with a UV map. Powered by [geo-ambient-occlusion](https://github.com/wwwtyro/geo-ambient-occlusion) |
| [colorspace](packages/colorspace) | Node.js, Web  | Vertex color colorspace correction.                                                                                                                                             |
| [prune](packages/prune)           | Node.js, Web  | Prunes duplicate accessors (and more, eventually). Based on a [gist by mattdesl](https://gist.github.com/mattdesl/aea40285e2d73916b6b9101b36d84da8).                            |
| [split](packages/split)           | Node.js, Web  | Splits the binary payload of a glTF file so separate mesh data is in separate .bin files.                                                                                       |

## Usage

### Programmatic

To be written.

### CLI

To be written.

## Contributing

This project consists of multiple NPM packages, managed in one repository with
https://lerna.js.org/. All code, excluding Node.js-based tests, is written in TypeScript.
I recommend using VSCode for linting and type information, which becomes especially helpful
when dealing with glTF schema objects.

After cloning the repository, run:

```
npm install && npm install -g lerna
lerna bootstrap
lerna link
```

The command `lerna bootstrap` will install dependencies into each package, and will then
link them together. If you make changes to a package's dependencies (e.g. run
`npm install <anything>`) you will need to run `lerna link` re-create the symlinks.

To build and test all code, run:

```
npm run dist
npm run test
```

To run an arbitrary command across all packages:

```
lerna exec -- <command>
```

While working, use `npm run watch` to watch and rebuild code after changes. To use a local
version of the CLI, run `npm link` within the `packages/cli` directory. Then
`gltf-transform -h` will use local code instead of any global installation.

In the event that dependencies get into a broken state, removing `package-lock.json` and
reinstalling may resolve things. I recommend compiling with Node.js v12.x, which is the
latest version with a prebuilt binary for `gl` as of April 2020.

### Pull requests

Before adding new features or packages to the repository, please open an issue on GitHub to discuss
your proposal. Some features may not fit the current scope of the project, or may be more than I am
able to maintain long-term. Even if a feature does not end up in this repository, custom
transform functions can be defined and used externally.

New features should be compatible with both Node.js and Web, though exceptions may be possible in
certain situations. To accomplish that, instances of [HTMLCanvasElement](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
or [headless-gl](https://github.com/stackgl/headless-gl) are passed into API functions by the user,
rather than being created by the API directly.

Runtime `dependencies` should be installed only to the sub-package in which they are needed. Any
`devDependencies` are shared across all packages, and should be installed in the project root. Pull
requests should omit any changes to `dist/*` artifacts. Changes including test coverage are
strongly preferred.

### Releasing

> NOTE: Only the maintainer can create new releases.

Currently Lerna [has trouble with 2FA OTPs](https://github.com/lerna/lerna/issues/1091). As a result,
new packages need to be published manually before they can be included in a repo-wide release. Once
that is done, normal releases should use:

```shell
NPM_CONFIG_OTP=123456 lerna publish <version> --force-publish=*
```
