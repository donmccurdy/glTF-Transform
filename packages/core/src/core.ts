export { Document, Transform } from './document';
export { Extension } from './extension';
export { Accessor, Animation, AnimationChannel, AnimationSampler, Buffer, Camera, ExtensionProperty, Property, Material, Mesh, Node, Primitive, PrimitiveTarget, Root, Scene, Skin, Texture, TextureInfo, TextureLink, TextureSampler, COPY_IDENTITY } from './properties';
export { Graph, GraphChild } from './graph/';
export { NodeIO, WebIO, ReaderContext, WriterContext } from './io/';
export { BufferUtils, FileUtils, ImageUtils, MathUtils, Logger, uuid } from './utils/';
export { PropertyType, vec2, vec3, vec4, mat3, mat4 } from './constants';

/** [[include:CONCEPTS.md]] */
namespace Concepts {};

/** [[include:LIBRARY.md]] */
namespace Library {};

/** [[include:EXTENSIONS.md]] */
namespace Extensions {};

/** [[include:CONTRIBUTING.md]] */
namespace Contributing {};

/**
 * # Commandline (CLI)
 *
 * For easier access to its library, glTF-Transform offers a command-line interface (CLI). The
 * CLI supports many of the features of the `@gltf-transform/lib` package, and some general tools
 * for inspecting and packing/unpacking glTF or GLB files.
 *
 * Installation:
 *
 * ```shell
 * npm install --global @gltf-transform/cli
 * ```
 *
 * Help output:
 *
 * ```shell
 * [[include:CLI_HELP.md]]
 * ```
 */
namespace CLI {};
