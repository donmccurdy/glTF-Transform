import { JSONDocument } from '../json-document';
import { Accessor, Buffer, Camera, Material, Mesh, Node, Property, Skin, Texture, TextureInfo } from '../properties';
import { GLTF } from '../types/gltf';
import { ImageUtils, Logger } from '../utils';
import { WriterOptions } from './writer';

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
	public readonly textureInfoDefMap = new Map<TextureInfo, GLTF.ITextureInfo>();
	public readonly samplerDefIndexMap = new Map<string, number>(); // samplerDef JSON -> index

	public readonly imageBufferViews: ArrayBuffer[] = [];
	public readonly otherBufferViews = new Map<Buffer, ArrayBuffer[]>();
	public readonly otherBufferViewsIndexMap = new Map<ArrayBuffer, number>();
	public readonly extensionData = {};

	public bufferURIGenerator: UniqueURIGenerator;
	public imageURIGenerator: UniqueURIGenerator;
	public logger: Logger;

	private readonly _accessorUsageMap = new Map<Accessor, string>();
	public readonly accessorUsageGroupedByParent = new Set<string>(['ARRAY_BUFFER']);

	constructor (public readonly jsonDoc: JSONDocument, public readonly options: WriterOptions) {}

	/**
	 * Creates a TextureInfo definition, and any Texture or Sampler definitions it requires. If
	 * possible, Texture and Sampler definitions are shared.
	 */
	public createTextureInfoDef(texture: Texture, textureInfo: TextureInfo): GLTF.ITextureInfo {
		const samplerDef = {
			magFilter: textureInfo.getMagFilter() || undefined,
			minFilter: textureInfo.getMinFilter() || undefined,
			wrapS: textureInfo.getWrapS(),
			wrapT: textureInfo.getWrapT(),
		} as GLTF.ISampler;

		const samplerKey = JSON.stringify(samplerDef);
		if (!this.samplerDefIndexMap.has(samplerKey)) {
			this.samplerDefIndexMap.set(samplerKey, this.jsonDoc.json.samplers.length);
			this.jsonDoc.json.samplers.push(samplerDef);
		}

		const textureDef = {
			source: this.imageIndexMap.get(texture),
			sampler: this.samplerDefIndexMap.get(samplerKey)
		} as GLTF.ITexture;

		const textureKey = JSON.stringify(textureDef);
		if (!this.textureDefIndexMap.has(textureKey)) {
			this.textureDefIndexMap.set(textureKey, this.jsonDoc.json.textures.length);
			this.jsonDoc.json.textures.push(textureDef);
		}

		const textureInfoDef = {
			index: this.textureDefIndexMap.get(textureKey),
			texCoord: textureInfo.getTexCoord(),
		} as GLTF.ITextureInfo;

		this.textureInfoDefMap.set(textureInfo, textureInfoDef);

		return textureInfoDef;
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

	public createImageData(imageDef: GLTF.IImage, data: ArrayBuffer, texture: Texture): void {
		if (this.options.isGLB) {
			this.imageBufferViews.push(data);
			imageDef.bufferView = this.jsonDoc.json.bufferViews.length;
			this.jsonDoc.json.bufferViews.push({
				buffer: 0,
				byteOffset: -1, // determined while iterating buffers, in Writer.ts.
				byteLength: data.byteLength
			});
		} else {
			const extension = ImageUtils.mimeTypeToExtension(texture.getMimeType());
			imageDef.uri = this.imageURIGenerator.createURI(texture, extension);
			this.jsonDoc.resources[imageDef.uri] = data;
		}
	}

	/**
	 * Returns usage for the given accessor, if any. Some accessor types must be grouped into
	 * buffer views with like accessors. This includes the specified buffer view "targets", but
	 * also implicit usage like IBMs or instanced mesh attributes.
	 */
	getAccessorUsage(accessor: Accessor): string {
		return this._accessorUsageMap.get(accessor);
	}

	/**
	 * Sets usage for the given accessor. Some accessor types must be grouped into
	 * buffer views with like accessors. This includes the specified buffer view "targets", but
	 * also implicit usage like IBMs or instanced mesh attributes. If unspecified, an accessor
	 * will be grouped with other accessors of unspecified usage.
	 */
	setAccessorUsage(accessor: Accessor, usage: string): this {
		const prevUsage = this._accessorUsageMap.get(accessor);
		if (prevUsage && prevUsage !== usage) {
			throw new Error(`Accessor with usage "${prevUsage}" cannot be reused as "${usage}".`);
		}
		this._accessorUsageMap.set(accessor, usage);
		return this;
	}

	/** Lists accessors grouped by usage. Accessors with unspecified usage are not included. */
	listAccessorsByUsage(): {[key: string]: Accessor[]} {
		const result = {};
		for (const [accessor, usage] of Array.from(this._accessorUsageMap.entries())) {
			result[usage] = result[usage] || [];
			result[usage].push(accessor);
		}
		return result;
	}
}

export class UniqueURIGenerator {
	private counter = 1;

	constructor (
		private readonly multiple: boolean,
		private readonly basename: string) {}

	public createURI(object: Texture | Buffer, extension: string): string {
		if (object.getURI()) {
			return object.getURI();
		} else if (!this.multiple) {
			return `${this.basename}.${extension}`;
		} else {
			return `${this.basename}_${this.counter++}.${extension}`;
		}
	}
}
