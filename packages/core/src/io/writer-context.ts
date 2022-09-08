import { BufferViewUsage, Format, PropertyType } from '../constants';
import type { Document } from '../document';
import type { JSONDocument } from '../json-document';
import type {
	Accessor,
	Animation,
	Buffer,
	Camera,
	Material,
	Mesh,
	Node,
	Property,
	Scene,
	Skin,
	Texture,
	TextureInfo,
} from '../properties';
import type { GLTF } from '../types/gltf';
import { ILogger, ImageUtils } from '../utils';
import type { WriterOptions } from './writer';

type PropertyDef = GLTF.IScene | GLTF.INode | GLTF.IMaterial | GLTF.ISkin | GLTF.ITexture;

enum BufferViewTarget {
	ARRAY_BUFFER = 34962,
	ELEMENT_ARRAY_BUFFER = 34963,
}

/**
 * Model class providing writing state to a {@link Writer} and its {@link Extension}
 * implementations.
 *
 * @hidden
 */
export class WriterContext {
	/** Explicit buffer view targets defined by glTF specification. */
	public static readonly BufferViewTarget = BufferViewTarget;
	/**
	 * Implicit buffer view usage, not required by glTF specification, but nonetheless useful for
	 * proper grouping of accessors into buffer views. Additional usages are defined by extensions,
	 * like `EXT_mesh_gpu_instancing`.
	 */
	public static readonly BufferViewUsage = BufferViewUsage;
	/** Maps usage type to buffer view target. Usages not mapped have undefined targets. */
	public static readonly USAGE_TO_TARGET: { [key: string]: BufferViewTarget | undefined } = {
		[BufferViewUsage.ARRAY_BUFFER]: BufferViewTarget.ARRAY_BUFFER,
		[BufferViewUsage.ELEMENT_ARRAY_BUFFER]: BufferViewTarget.ELEMENT_ARRAY_BUFFER,
	};

	public readonly accessorIndexMap = new Map<Accessor, number>();
	public readonly animationIndexMap = new Map<Animation, number>();
	public readonly bufferIndexMap = new Map<Buffer, number>();
	public readonly cameraIndexMap = new Map<Camera, number>();
	public readonly skinIndexMap = new Map<Skin, number>();
	public readonly materialIndexMap = new Map<Material, number>();
	public readonly meshIndexMap = new Map<Mesh, number>();
	public readonly nodeIndexMap = new Map<Node, number>();
	public readonly imageIndexMap = new Map<Texture, number>();
	public readonly textureDefIndexMap = new Map<string, number>(); // textureDef JSON -> index
	public readonly textureInfoDefMap = new Map<TextureInfo, GLTF.ITextureInfo>();
	public readonly samplerDefIndexMap = new Map<string, number>(); // samplerDef JSON -> index
	public readonly sceneIndexMap = new Map<Scene, number>();

	public readonly imageBufferViews: Uint8Array[] = [];
	public readonly otherBufferViews = new Map<Buffer, Uint8Array[]>();
	public readonly otherBufferViewsIndexMap = new Map<Uint8Array, number>();
	public readonly extensionData: { [key: string]: unknown } = {};

	public bufferURIGenerator: UniqueURIGenerator<Buffer>;
	public imageURIGenerator: UniqueURIGenerator<Texture>;
	public logger: ILogger;

	private readonly _accessorUsageMap = new Map<Accessor, BufferViewUsage | string>();
	public readonly accessorUsageGroupedByParent = new Set<string>(['ARRAY_BUFFER']);
	public readonly accessorParents = new Map<Property, Set<Accessor>>();

	constructor(
		private readonly _doc: Document,
		public readonly jsonDoc: JSONDocument,
		public readonly options: Required<WriterOptions>
	) {
		const root = _doc.getRoot();
		const numBuffers = root.listBuffers().length;
		const numImages = root.listTextures().length;
		this.bufferURIGenerator = new UniqueURIGenerator(numBuffers > 1, () => options.basename || 'buffer');
		this.imageURIGenerator = new UniqueURIGenerator(
			numImages > 1,
			(texture) => getSlot(_doc, texture) || options.basename || 'texture'
		);
		this.logger = _doc.getLogger();
	}

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
			this.samplerDefIndexMap.set(samplerKey, this.jsonDoc.json.samplers!.length);
			this.jsonDoc.json.samplers!.push(samplerDef);
		}

		const textureDef = {
			source: this.imageIndexMap.get(texture),
			sampler: this.samplerDefIndexMap.get(samplerKey),
		} as GLTF.ITexture;

		const textureKey = JSON.stringify(textureDef);
		if (!this.textureDefIndexMap.has(textureKey)) {
			this.textureDefIndexMap.set(textureKey, this.jsonDoc.json.textures!.length);
			this.jsonDoc.json.textures!.push(textureDef);
		}

		const textureInfoDef = {
			index: this.textureDefIndexMap.get(textureKey),
		} as GLTF.ITextureInfo;

		if (textureInfo.getTexCoord() !== 0) {
			textureInfoDef.texCoord = textureInfo.getTexCoord();
		}
		if (Object.keys(textureInfo.getExtras()).length > 0) {
			textureInfoDef.extras = textureInfo.getExtras();
		}

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

		const needsBounds = this._doc
			.getGraph()
			.listParentEdges(accessor)
			.some(
				(edge) =>
					(edge.getName() === 'attributes' && edge.getAttributes().key === 'POSITION') ||
					edge.getName() === 'input'
			);
		if (needsBounds) {
			accessorDef.max = accessor.getMax([]).map(Math.fround);
			accessorDef.min = accessor.getMin([]).map(Math.fround);
		}

		if (accessor.getNormalized()) {
			accessorDef.normalized = accessor.getNormalized();
		}

		return accessorDef;
	}

	public createImageData(imageDef: GLTF.IImage, data: Uint8Array, texture: Texture): void {
		if (this.options.format === Format.GLB) {
			this.imageBufferViews.push(data);
			imageDef.bufferView = this.jsonDoc.json.bufferViews!.length;
			this.jsonDoc.json.bufferViews!.push({
				buffer: 0,
				byteOffset: -1, // determined while iterating buffers, in Writer.ts.
				byteLength: data.byteLength,
			});
		} else {
			const extension = ImageUtils.mimeTypeToExtension(texture.getMimeType());
			imageDef.uri = this.imageURIGenerator.createURI(texture, extension);
			this.jsonDoc.resources[imageDef.uri] = data;
		}
	}

	/**
	 * Returns implicit usage type of the given accessor, related to grouping accessors into
	 * buffer views. Usage is a superset of buffer view target, including ARRAY_BUFFER and
	 * ELEMENT_ARRAY_BUFFER, but also usages that do not match GPU buffer view targets such as
	 * IBMs. Additional usages are defined by extensions, like `EXT_mesh_gpu_instancing`.
	 */
	public getAccessorUsage(accessor: Accessor): BufferViewUsage | string {
		const cachedUsage = this._accessorUsageMap.get(accessor);
		if (cachedUsage) return cachedUsage;

		for (const edge of this._doc.getGraph().listParentEdges(accessor)) {
			const { usage } = edge.getAttributes() as { usage: BufferViewUsage | undefined };

			if (usage) return usage;

			if (edge.getParent().propertyType !== PropertyType.ROOT) {
				this._doc.getLogger().warn(`Missing attribute ".usage" on edge, "${edge.getName()}".`);
			}
		}

		// Group accessors with no specified usage into a miscellaneous buffer view.
		return WriterContext.BufferViewUsage.OTHER;
	}

	/**
	 * Sets usage for the given accessor. Some accessor types must be grouped into
	 * buffer views with like accessors. This includes the specified buffer view "targets", but
	 * also implicit usage like IBMs or instanced mesh attributes. If unspecified, an accessor
	 * will be grouped with other accessors of unspecified usage.
	 */
	public addAccessorToUsageGroup(accessor: Accessor, usage: BufferViewUsage | string): this {
		const prevUsage = this._accessorUsageMap.get(accessor);
		if (prevUsage && prevUsage !== usage) {
			throw new Error(`Accessor with usage "${prevUsage}" cannot be reused as "${usage}".`);
		}
		this._accessorUsageMap.set(accessor, usage);
		return this;
	}

	/** Lists accessors grouped by usage. Accessors with unspecified usage are not included. */
	public listAccessorUsageGroups(): { [key: string]: Accessor[] } {
		const result = {} as { [key: string]: Accessor[] };
		for (const [accessor, usage] of Array.from(this._accessorUsageMap.entries())) {
			result[usage] = result[usage] || [];
			result[usage].push(accessor);
		}
		return result;
	}
}

export class UniqueURIGenerator<T extends Texture | Buffer> {
	private counter = {} as Record<string, number>;

	constructor(private readonly multiple: boolean, private readonly basename: (t: T) => string) {}

	public createURI(object: T, extension: string): string {
		if (object.getURI()) {
			return object.getURI();
		} else if (!this.multiple) {
			return `${this.basename(object)}.${extension}`;
		} else {
			const basename = this.basename(object);
			this.counter[basename] = this.counter[basename] || 1;
			return `${basename}_${this.counter[basename]++}.${extension}`;
		}
	}
}

/** Returns the first slot (by name) to which the texture is assigned. */
function getSlot(document: Document, texture: Texture): string {
	const edge = document
		.getGraph()
		.listParentEdges(texture)
		.find((edge) => edge.getParent() !== document.getRoot());
	return edge ? edge.getName().replace(/texture$/i, '') : '';
}
