import { BufferViewUsage } from '../constants';
import { Document } from '../document';
import { JSONDocument } from '../json-document';
import { Accessor, Buffer, Camera, Material, Mesh, Node, Property, Skin, Texture, TextureInfo } from '../properties';
import { GLTF } from '../types/gltf';
import { Logger } from '../utils';
import { WriterOptions } from './writer';
declare type PropertyDef = GLTF.IScene | GLTF.INode | GLTF.IMaterial | GLTF.ISkin | GLTF.ITexture;
declare enum BufferViewTarget {
    ARRAY_BUFFER = 34962,
    ELEMENT_ARRAY_BUFFER = 34963
}
/**
 * Model class providing writing state to a {@link Writer} and its {@link Extension}
 * implementations.
 *
 * @hidden
 */
export declare class WriterContext {
    private readonly _doc;
    readonly jsonDoc: JSONDocument;
    readonly options: Required<WriterOptions>;
    /** Explicit buffer view targets defined by glTF specification. */
    static readonly BufferViewTarget: typeof BufferViewTarget;
    /**
     * Implicit buffer view usage, not required by glTF specification, but nonetheless useful for
     * proper grouping of accessors into buffer views. Additional usages are defined by extensions,
     * like `EXT_mesh_gpu_instancing`.
     */
    static readonly BufferViewUsage: typeof BufferViewUsage;
    /** Maps usage type to buffer view target. Usages not mapped have undefined targets. */
    static readonly USAGE_TO_TARGET: {
        [key: string]: BufferViewTarget | undefined;
    };
    readonly accessorIndexMap: Map<Accessor, number>;
    readonly bufferIndexMap: Map<Buffer, number>;
    readonly cameraIndexMap: Map<Camera, number>;
    readonly skinIndexMap: Map<Skin, number>;
    readonly materialIndexMap: Map<Material, number>;
    readonly meshIndexMap: Map<Mesh, number>;
    readonly nodeIndexMap: Map<Node, number>;
    readonly imageIndexMap: Map<Texture, number>;
    readonly textureDefIndexMap: Map<string, number>;
    readonly textureInfoDefMap: Map<TextureInfo, GLTF.ITextureInfo>;
    readonly samplerDefIndexMap: Map<string, number>;
    readonly imageBufferViews: Uint8Array[];
    readonly otherBufferViews: Map<Buffer, Uint8Array[]>;
    readonly otherBufferViewsIndexMap: Map<Uint8Array, number>;
    readonly extensionData: {
        [key: string]: unknown;
    };
    bufferURIGenerator: UniqueURIGenerator;
    imageURIGenerator: UniqueURIGenerator;
    logger: Logger;
    private readonly _accessorUsageMap;
    readonly accessorUsageGroupedByParent: Set<string>;
    readonly accessorParents: Map<Property<import("../properties").IProperty>, Set<Accessor>>;
    constructor(_doc: Document, jsonDoc: JSONDocument, options: Required<WriterOptions>);
    /**
     * Creates a TextureInfo definition, and any Texture or Sampler definitions it requires. If
     * possible, Texture and Sampler definitions are shared.
     */
    createTextureInfoDef(texture: Texture, textureInfo: TextureInfo): GLTF.ITextureInfo;
    createPropertyDef(property: Property): PropertyDef;
    createAccessorDef(accessor: Accessor): GLTF.IAccessor;
    createImageData(imageDef: GLTF.IImage, data: Uint8Array, texture: Texture): void;
    /**
     * Returns implicit usage type of the given accessor, related to grouping accessors into
     * buffer views. Usage is a superset of buffer view target, including ARRAY_BUFFER and
     * ELEMENT_ARRAY_BUFFER, but also usages that do not match GPU buffer view targets such as
     * IBMs. Additional usages are defined by extensions, like `EXT_mesh_gpu_instancing`.
     */
    getAccessorUsage(accessor: Accessor): BufferViewUsage | string;
    /**
     * Sets usage for the given accessor. Some accessor types must be grouped into
     * buffer views with like accessors. This includes the specified buffer view "targets", but
     * also implicit usage like IBMs or instanced mesh attributes. If unspecified, an accessor
     * will be grouped with other accessors of unspecified usage.
     */
    addAccessorToUsageGroup(accessor: Accessor, usage: BufferViewUsage | string): this;
    /** Lists accessors grouped by usage. Accessors with unspecified usage are not included. */
    listAccessorUsageGroups(): {
        [key: string]: Accessor[];
    };
}
export declare class UniqueURIGenerator {
    private readonly multiple;
    private readonly basename;
    private counter;
    constructor(multiple: boolean, basename: string);
    createURI(object: Texture | Buffer, extension: string): string;
}
export {};
