export { Container } from './container';
export { Accessor, Buffer, Property, Material, Mesh, Node, Primitive, Root, Scene, Texture, TextureInfo } from './properties';
export { Graph } from './graph/';
export { NodeIO, WebIO } from './io/';
export { BufferUtils, CoreUtils, FileUtils, ImageUtils, Logger, LoggerVerbosity, uuid } from './utils/';

// Improved gl-matrix performance in modern web browsers.
import {glMatrix} from 'gl-matrix';
glMatrix.setMatrixArrayType(Array);
