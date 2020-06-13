import { NativeDocument } from '../native-document';
import { Accessor, Animation, Buffer, Camera, Material, Mesh, Node, Scene, Skin, Texture } from '../properties';

/**
 * Model class providing glTF-Transform objects representing each definition in the glTF file, used
 * by a {@link Writer} and its {@link Extension} implementations. Indices of all properties will be
 * consistent with the glTF file.
 */
export class ReaderContext {
	public buffers: Buffer[] = [];
	public bufferViewBuffers: Buffer[] = [];
	public accessors: Accessor[] = [];
	public textures: Texture[] = [];
	public materials: Material[] = [];
	public meshes: Mesh[] = [];
	public cameras: Camera[] = [];
	public nodes: Node[] = [];
	public skins: Skin[] = [];
	public animations: Animation[] = [];
	public scenes: Scene[] = [];

	constructor (public readonly nativeDocument: NativeDocument) {}
}
