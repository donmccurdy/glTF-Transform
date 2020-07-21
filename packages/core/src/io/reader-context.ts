import { Document } from '../document';
import { NativeDocument } from '../native-document';
import { Accessor, Animation, Buffer, Camera, Material, Mesh, Node, Scene, Skin, Texture, TextureInfo, TextureSampler } from '../properties';

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

	constructor (
		public readonly document: Document,
		public readonly nativeDocument: NativeDocument
	) {}

	public setTextureInfo(textureInfo: TextureInfo, textureInfoDef: GLTF.ITextureInfo): void {
		if (textureInfoDef.texCoord !== undefined) {
			textureInfo.setTexCoord(textureInfoDef.texCoord);
		}
	}

	// eslint-disable-next-line max-len
	public setTextureSampler(textureSampler: TextureSampler, textureInfoDef: GLTF.ITextureInfo): void {
		const textureDef = this.nativeDocument.json.textures[textureInfoDef.index];

		if (textureDef.sampler === undefined) return;

		const samplerDef = this.nativeDocument.json.samplers[textureDef.sampler];

		if (samplerDef.magFilter !== undefined) {
			textureSampler.setMagFilter(samplerDef.magFilter);
		}
		if (samplerDef.minFilter !== undefined) {
			textureSampler.setMinFilter(samplerDef.minFilter);
		}
		if (samplerDef.wrapS !== undefined) {
			textureSampler.setWrapS(samplerDef.wrapS);
		}
		if (samplerDef.wrapT !== undefined) {
			textureSampler.setWrapT(samplerDef.wrapT);
		}
	}
}
