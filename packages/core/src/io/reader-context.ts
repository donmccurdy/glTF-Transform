import type { JSONDocument } from '../json-document.js';
import type { Document } from '../document.js';
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
import type { ILogger } from '../utils/logger.js';

/**
 * Model class providing glTF Transform objects representing each definition in the glTF file, used
 * by a {@link GLTFReader} and its {@link Extension} implementations. Indices of all properties will be
 * consistent with the glTF file.
 *
 * @hidden
 */
export class ReaderContext {
	public readonly document: Document;
	// TODO(v5): Rename to jsonDocument;
	public readonly jsonDoc: JSONDocument;
	private readonly logger: ILogger;

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

	private _usedURIs = new Set<string>();

	constructor(document: Document, jsonDoc: JSONDocument) {
		this.document = document;
		this.jsonDoc = jsonDoc;
		this.logger = document.getLogger();
	}

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

	public requestURI(uri: string): string {
		// https://github.com/KhronosGroup/glTF/issues/2446
		if (this._usedURIs.has(uri)) {
			this.logger.warn(`Duplicate resource URI, "${uri}".`);
			return '';
		}

		this._usedURIs.add(uri);
		return uri;
	}
}
