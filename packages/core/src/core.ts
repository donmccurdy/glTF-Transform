/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-namespace */

export { Document, Transform } from './document';
export { JSONDocument } from './json-document';
export { Extension } from './extension';
export { Accessor, Animation, AnimationChannel, AnimationSampler, Buffer, Camera, ExtensionProperty, Property, Material, Mesh, Node, Primitive, PrimitiveTarget, Root, Scene, Skin, Texture, TextureInfo, AttributeLink, IndexLink, COPY_IDENTITY } from './properties';
export { Graph, GraphChild, GraphChildList, Link } from './graph/';
export { NodeIO, WebIO, ReaderContext, WriterContext } from './io/';
export { BufferUtils, ColorUtils, FileUtils, ImageUtils, ImageUtilsFormat, Logger, MathUtils, uuid } from './utils/';
export { TypedArray, TypedArrayConstructor, PropertyType, VertexLayout, vec2, vec3, vec4, mat3, mat4, GLB_BUFFER } from './constants';
export { GLTF } from './types/gltf';

/** [[include:CONCEPTS.md]] */
namespace Concepts {}

/** [[include:LIBRARY.md]] */
namespace Library {}

/** [[include:EXTENSIONS.md]] */
namespace Extensions {}

/** [[include:CONTRIBUTING.md]] */
namespace Contributing {}

/**
 * # CLI
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
namespace CLI {}
