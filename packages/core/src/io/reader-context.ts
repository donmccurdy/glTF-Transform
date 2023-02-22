import type { JSONDocument } from '../json-document.js';
import type {
	Accessor,
	Animation,
	Buffer,
	Camera,
	Material,
	Mesh,
	Node,
	Scene,
	Skin,
	Texture,
	TextureInfo,
} from '../properties/index.js';
import type { GLTF } from '../types/gltf.js';

/**
 * Model class providing glTF-Transform objects representing each definition in the glTF file, used
 * by a {@link Writer} and its {@link Extension} implementations. Indices of all properties will be
 * consistent with the glTF file.
 *
 * @hidden
 */
export class ReaderContext {
	public buffers: Buffer[] = [];
	public bufferViews: Uint8Array[] = [];
	public bufferViewBuffers: Buffer[] = [];
	public accessors: Accessor[] = [];
	public textures: Texture[] = [];
	public textureInfos: Map<TextureInfo, GLTF.ITextureInfo> = new Map();
	public materials: Material[] = [];
	public meshes: Mesh[] = [];
	public cameras: Camera[] = [];
	public nodes: Node[] = [];
	public skins: Skin[] = [];
	public animations: Animation[] = [];
	public scenes: Scene[] = [];

	constructor(public readonly jsonDoc: JSONDocument) {}

	public setTextureInfo(textureInfo: TextureInfo, textureInfoDef: GLTF.ITextureInfo): void {
		this.textureInfos.set(textureInfo, textureInfoDef);

		if (textureInfoDef.texCoord !== undefined) {
			textureInfo.setTexCoord(textureInfoDef.texCoord);
		}
		if (textureInfoDef.extras !== undefined) {
			textureInfo.setExtras(textureInfoDef.extras);
		}

		const textureDef = this.jsonDoc.json.textures![textureInfoDef.index];

		if (textureDef.sampler === undefined) return;

		const samplerDef = this.jsonDoc.json.samplers![textureDef.sampler];

		if (samplerDef.magFilter !== undefined) {
			textureInfo.setMagFilter(samplerDef.magFilter);
		}
		if (samplerDef.minFilter !== undefined) {
			textureInfo.setMinFilter(samplerDef.minFilter);
		}
		if (samplerDef.wrapS !== undefined) {
			textureInfo.setWrapS(samplerDef.wrapS);
		}
		if (samplerDef.wrapT !== undefined) {
			textureInfo.setWrapT(samplerDef.wrapT);
		}
	}
}
