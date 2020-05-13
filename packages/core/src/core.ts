export { Document, Transform } from './document';
export { Accessor, Buffer, Camera, Property, Material, Mesh, Node, Primitive, Root, Scene, Skin, Texture, TextureInfo, TextureSampler } from './properties';
export { Graph } from './graph/';
export { NodeIO, WebIO } from './io/';
export { BufferUtils, FileUtils, ImageUtils, Logger, uuid } from './utils/';

// Improved gl-matrix performance in modern web browsers.
import {glMatrix} from 'gl-matrix';
glMatrix.setMatrixArrayType(Array);

/** [[include:CONCEPTS.md]] */
namespace Concepts {};

/** [[include:SCRIPTING.md]] */
namespace Scripting {};

/** [[include:CONTRIBUTING.md]] */
namespace Contributing {};
