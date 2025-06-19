export { Document, type Transform, type TransformContext } from './document.js';
export type { JSONDocument } from './json-document.js';
export { Extension } from './extension.js';
export {
	Accessor,
	Animation,
	AnimationChannel,
	AnimationSampler,
	Buffer,
	Camera,
	ExtensionProperty,
	ExtensibleProperty,
	Property,
	type IProperty,
	Material,
	Mesh,
	Node,
	Primitive,
	PrimitiveTarget,
	Root,
	Scene,
	Skin,
	Texture,
	TextureInfo,
	type PropertyResolver,
	COPY_IDENTITY,
} from './properties/index.js';
export { Graph, GraphEdge, type Ref, RefList, RefSet, RefMap } from 'property-graph';
export { DenoIO, PlatformIO, NodeIO, WebIO, ReaderContext, WriterContext } from './io/index.js';
export {
	BufferUtils,
	HTTPUtils,
	ColorUtils,
	FileUtils,
	ImageUtils,
	type ImageUtilsFormat,
	type ILogger,
	Logger,
	MathUtils,
	Verbosity,
	getBounds,
	uuid,
} from './utils/index.js';
export {
	type TypedArray,
	type TypedArrayConstructor,
	ComponentTypeToTypedArray,
	PropertyType,
	Format,
	type Nullable,
	TextureChannel,
	VertexLayout,
	type vec2,
	type vec3,
	type vec4,
	type mat3,
	type mat4,
	type bbox,
	GLB_BUFFER,
	VERSION,
} from './constants.js';
export type { GLTF } from './types/gltf.js';
