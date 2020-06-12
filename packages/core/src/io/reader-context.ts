import { NativeDocument } from '../native-document';
import { Accessor, Animation, Buffer, Camera, Material, Mesh, Node, Scene, Skin, Texture } from '../properties';

/**
 * Model class providing glTF-Transform objects representing each definition in the glTF file, used
 * by a {@link Writer} and its {@link Extension} implementations. Indices of all properties will be
 * consistent with the glTF file.
 */
export class ReaderContext {
	nativeDocument: NativeDocument;
	buffers: Buffer[] = [];
	bufferViewBuffers: Buffer[] = [];
	accessors: Accessor[] = [];
	textures: Texture[] = [];
	materials: Material[] = [];
	meshes: Mesh[] = [];
	cameras: Camera[] = [];
	nodes: Node[] = [];
	skins: Skin[] = [];
	animations: Animation[] = [];
	scenes: Scene[] = [];
}
