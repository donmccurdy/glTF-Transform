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

## Concepts

To be written.

## Installation

To be written.

## Transforms & CLI

To be written.

## Scripting

To be written.

## Contributing

To be written.
