export { Document, Transform } from './document';
export { Accessor, Buffer, Property, Material, Mesh, Node, Primitive, Root, Scene, Texture, TextureInfo, TextureSampler } from './properties';
export { Graph } from './graph/';
export { NodeIO, WebIO } from './io/';
export { BufferUtils, FileUtils, ImageUtils, Logger, uuid } from './utils/';

// Improved gl-matrix performance in modern web browsers.
import {glMatrix} from 'gl-matrix';
glMatrix.setMatrixArrayType(Array);
