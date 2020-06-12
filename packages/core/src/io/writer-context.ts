import { NativeDocument } from '../native-document';
import { Accessor, Camera, Material, Mesh, Node, Property, Skin, Texture, TextureInfo, TextureSampler } from '../properties';

type PropertyDef = GLTF.IScene | GLTF.INode | GLTF.IMaterial | GLTF.ISkin | GLTF.ITexture;

/**
 * Model class providing writing state to a {@link Writer} and its {@link Extension}
 * implementations.
 *
 * @hidden
 */
export class WriterContext {
	public readonly accessorIndexMap = new Map<Accessor, number>();
	public readonly cameraIndexMap = new Map<Camera, number>();
	public readonly skinIndexMap = new Map<Skin, number>();
	public readonly materialIndexMap = new Map<Material, number>();
	public readonly meshIndexMap = new Map<Mesh, number>();
	public readonly nodeIndexMap = new Map<Node, number>();
	public readonly imageIndexMap = new Map<Texture, number>();
	public readonly textureDefIndexMap = new Map<string, number>(); // textureDef JSON -> index
	public readonly samplerDefIndexMap = new Map<string, number>(); // samplerDef JSON -> index

	public readonly imageData: ArrayBuffer[] = [];

	constructor (public readonly nativeDocument: NativeDocument) {}

	/**
	 * Creates a TextureInfo definition, and any Texture or Sampler definitions it requires. If
	 * possible, Texture and Sampler definitions are shared.
	 */
	public createTextureInfoDef(texture: Texture, textureInfo: TextureInfo, textureSampler: TextureSampler): GLTF.ITextureInfo {
		const samplerDef = {
			magFilter: textureSampler.getMagFilter() || undefined,
			minFilter: textureSampler.getMinFilter() || undefined,
			wrapS: textureSampler.getWrapS(),
			wrapT: textureSampler.getWrapT(),
		} as GLTF.ISampler;

		const samplerKey = JSON.stringify(samplerDef);
		if (!this.samplerDefIndexMap.has(samplerKey)) {
			this.samplerDefIndexMap.set(samplerKey, this.nativeDocument.json.samplers.length);
			this.nativeDocument.json.samplers.push(samplerDef);
		}

		const textureDef = {
			source: this.imageIndexMap.get(texture),
			sampler: this.samplerDefIndexMap.get(samplerKey)
		} as GLTF.ITexture;

		const textureKey = JSON.stringify(textureDef);
		if (!this.textureDefIndexMap.has(textureKey)) {
			this.textureDefIndexMap.set(textureKey, this.nativeDocument.json.textures.length);
			this.nativeDocument.json.textures.push(textureDef);
		}

		return {
			index: this.textureDefIndexMap.get(textureKey),
			texCoord: textureInfo.getTexCoord(),
		} as GLTF.ITextureInfo;
	}

	public createPropertyDef(property: Property): PropertyDef {
		const def = {} as PropertyDef;
		if (property.getName()) {
			def.name = property.getName();
		}
		if (Object.keys(property.getExtras()).length > 0) {
			def.extras = property.getExtras();
		}
		return def;
	}

	public createAccessorDef(accessor: Accessor): GLTF.IAccessor {
		const accessorDef = this.createPropertyDef(accessor) as GLTF.IAccessor;
		accessorDef.type = accessor.getType();
		accessorDef.componentType = accessor.getComponentType();
		accessorDef.count = accessor.getCount();
		accessor.getMax((accessorDef.max = []));
		accessor.getMin((accessorDef.min = []));
		accessorDef.normalized = accessor.getNormalized();
		return accessorDef;
	}
}
