import { Nullable, PropertyType } from '../constants';
import { Extension } from '../extension';
import { Accessor } from './accessor';
import { Animation } from './animation';
import { Buffer } from './buffer';
import { Camera } from './camera';
import { Material } from './material';
import { Mesh } from './mesh';
import { Node } from './node';
import { IProperty, Property } from './property';
import { Scene } from './scene';
import { Skin } from './skin';
import { Texture } from './texture';
interface IAsset {
    version: string;
    minVersion?: string;
    generator?: string;
    copyright?: string;
    [key: string]: unknown;
}
interface IRoot extends IProperty {
    asset: IAsset;
    defaultScene: Scene;
    accessors: Accessor[];
    animations: Animation[];
    buffers: Buffer[];
    cameras: Camera[];
    materials: Material[];
    meshes: Mesh[];
    nodes: Node[];
    scenes: Scene[];
    skins: Skin[];
    textures: Texture[];
}
/**
 * # Root
 *
 * *Root property of a glTF asset.*
 *
 * Any properties to be exported with a particular asset must be referenced (directly or
 * indirectly) by the root. Metadata about the asset's license, generator, and glTF specification
 * version are stored in the asset, accessible with {@link .getAsset}().
 *
 * Properties are added to the root with factory methods on its {@link Document}, and removed by
 * calling {@link Property.dispose}() on the resource. Any properties that have been created but
 * not disposed will be included when calling the various `root.list*()` methods.
 *
 * A document's root cannot be removed, and no other root may be created. Unlike other
 * {@link Property} types, the `.dispose()`, `.detach()` methods have no useful function on a
 * Root property.
 *
 * Usage:
 *
 * ```ts
 * const root = document.getRoot();
 * const scene = document.createScene('myScene');
 * const node = document.createNode('myNode');
 * scene.addChild(node);
 *
 * console.log(root.listScenes()); // → [scene x 1]
 * ```
 *
 * Reference: [glTF → Concepts](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#concepts)
 *
 * @category Properties
 */
export declare class Root extends Property<IRoot> {
    propertyType: PropertyType.ROOT;
    private readonly _extensions;
    protected init(): void;
    protected getDefaults(): Nullable<IRoot>;
    clone(): this;
    copy(other: this, resolve?: <T extends Property<IProperty>>(t: T) => T): this;
    private _addChildOfRoot;
    /**
     * Returns the `asset` object, which specifies the target glTF version of the asset. Additional
     * metadata can be stored in optional properties such as `generator` or `copyright`.
     *
     * Reference: [glTF → Asset](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#asset)
     */
    getAsset(): IAsset;
    /**********************************************************************************************
     * Extensions.
     */
    /** Lists all {@link Extension} properties enabled for this root. */
    listExtensionsUsed(): Extension[];
    /** Lists all {@link Extension} properties enabled and required for this root. */
    listExtensionsRequired(): Extension[];
    /**********************************************************************************************
     * Properties.
     */
    /** Lists all {@link Scene} properties associated with this root. */
    listScenes(): Scene[];
    /** Default {@link Scene} associated with this root. */
    setDefaultScene(defaultScene: Scene | null): this;
    /** Default {@link Scene} associated with this root. */
    getDefaultScene(): Scene | null;
    /** Lists all {@link Node} properties associated with this root. */
    listNodes(): Node[];
    /** Lists all {@link Camera} properties associated with this root. */
    listCameras(): Camera[];
    /** Lists all {@link Skin} properties associated with this root. */
    listSkins(): Skin[];
    /** Lists all {@link Mesh} properties associated with this root. */
    listMeshes(): Mesh[];
    /** Lists all {@link Material} properties associated with this root. */
    listMaterials(): Material[];
    /** Lists all {@link Texture} properties associated with this root. */
    listTextures(): Texture[];
    /** Lists all {@link Animation} properties associated with this root. */
    listAnimations(): Animation[];
    /** Lists all {@link Accessor} properties associated with this root. */
    listAccessors(): Accessor[];
    /** Lists all {@link Buffer} properties associated with this root. */
    listBuffers(): Buffer[];
}
export {};
