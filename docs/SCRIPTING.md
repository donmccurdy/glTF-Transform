# Scripting & CLI

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
