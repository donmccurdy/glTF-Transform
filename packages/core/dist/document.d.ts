import { Extension } from './extension';
import { Graph } from 'property-graph';
import { Accessor, Animation, AnimationChannel, AnimationSampler, Buffer, Camera, Material, Mesh, Node, Primitive, PrimitiveTarget, Property, Root, Scene, Skin, Texture } from './properties';
import { Logger } from './utils';
export interface TransformContext {
    stack: string[];
}
export declare type Transform = (doc: Document, context?: TransformContext) => void;
/**
 * # Document
 *
 * *Wraps a glTF asset and its resources for easier modification.*
 *
 * Documents manage glTF assets and the relationships among dependencies. The document wrapper
 * allow tools to read and write changes without dealing with array indices or byte offsets, which
 * would otherwise require careful management over the course of a file modification. An internal
 * graph structure allows any property in the glTF file to maintain references to its dependencies,
 * and makes it easy to determine where a particular property dependency is being used. For
 * example, finding a list of materials that use a particular texture is as simple as calling
 * {@link Texture.listParents}().
 *
 * A new resource {@link Property} (e.g. a {@link Mesh} or {@link Material}) is created by calling
 * 'create' methods on the document. Resources are destroyed by calling {@link Property.dispose}().
 *
 * ```ts
 * import fs from 'fs/promises';
 * import { Document } from '@gltf-transform/core';
 * import { dedup } from '@gltf-transform/functions';
 *
 * const doc = new Document();
 *
 * const texture1 = doc.createTexture('myTexture')
 * 	.setImage(await fs.readFile('path/to/image.png'))
 * 	.setMimeType('image/png');
 * const texture2 = doc.createTexture('myTexture2')
 * 	.setImage(await fs.readFile('path/to/image2.png'))
 * 	.setMimeType('image/png');
 *
 * // Document containing duplicate copies of the same texture.
 * doc.getRoot().listTextures(); // → [texture x 2]
 *
 * await doc.transform(
 * 	dedup({textures: true}),
 * 	// ...
 * );
 *
 * // Document with duplicate textures removed.
 * doc.getRoot().listTextures(); // → [texture x 1]
 * ```
 *
 * Reference:
 * - [glTF → Basics](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#gltf-basics)
 * - [glTF → Concepts](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#concepts)
 *
 * @category Documents
 */
export declare class Document {
    private _graph;
    private _root;
    private _logger;
    /** Returns the glTF {@link Root} property. */
    getRoot(): Root;
    /**
     * Returns the {@link Graph} representing connectivity of resources within this document.
     *
     * @hidden
     */
    getGraph(): Graph<Property>;
    /** Returns the {@link Logger} instance used for any operations performed on this document. */
    getLogger(): Logger;
    /**
     * Overrides the {@link Logger} instance used for any operations performed on this document.
     *
     * Usage:
     *
     * ```ts
     * doc
     * 	.setLogger(new Logger(Logger.Verbosity.SILENT))
     * 	.transform(dedup(), weld());
     * ```
     */
    setLogger(logger: Logger): Document;
    /** Clones this Document, copying all resources within it. */
    clone(): Document;
    /** Merges the content of another Document into this one, without affecting the original. */
    merge(other: Document): this;
    /**
     * Applies a series of modifications to this document. Each transformation is asynchronous,
     * takes the {@link Document} as input, and returns nothing. Transforms are applied in the
     * order given, which may affect the final result.
     *
     * Usage:
     *
     * ```ts
     * await doc.transform(
     * 	dedup(),
     * 	prune()
     * );
     * ```
     *
     * @param transforms List of synchronous transformation functions to apply.
     */
    transform(...transforms: Transform[]): Promise<this>;
    /**********************************************************************************************
     * Extension factory method.
     */
    /**
     * Creates a new {@link Extension}, for the extension type of the given constructor. If the
     * extension is already enabled for this Document, the previous Extension reference is reused.
     */
    createExtension<T extends Extension>(ctor: new (doc: Document) => T): T;
    /**********************************************************************************************
     * Property factory methods.
     */
    /** Creates a new {@link Scene} attached to this document's {@link Root}. */
    createScene(name?: string): Scene;
    /** Creates a new {@link Node} attached to this document's {@link Root}. */
    createNode(name?: string): Node;
    /** Creates a new {@link Camera} attached to this document's {@link Root}. */
    createCamera(name?: string): Camera;
    /** Creates a new {@link Skin} attached to this document's {@link Root}. */
    createSkin(name?: string): Skin;
    /** Creates a new {@link Mesh} attached to this document's {@link Root}. */
    createMesh(name?: string): Mesh;
    /**
     * Creates a new {@link Primitive}. Primitives must be attached to a {@link Mesh}
     * for use and export; they are not otherwise associated with a {@link Root}.
     */
    createPrimitive(): Primitive;
    /**
     * Creates a new {@link PrimitiveTarget}, or morph target. Targets must be attached to a
     * {@link Primitive} for use and export; they are not otherwise associated with a {@link Root}.
     */
    createPrimitiveTarget(name?: string): PrimitiveTarget;
    /** Creates a new {@link Material} attached to this document's {@link Root}. */
    createMaterial(name?: string): Material;
    /** Creates a new {@link Texture} attached to this document's {@link Root}. */
    createTexture(name?: string): Texture;
    /** Creates a new {@link Animation} attached to this document's {@link Root}. */
    createAnimation(name?: string): Animation;
    /**
     * Creates a new {@link AnimationChannel}. Channels must be attached to an {@link Animation}
     * for use and export; they are not otherwise associated with a {@link Root}.
     */
    createAnimationChannel(name?: string): AnimationChannel;
    /**
     * Creates a new {@link AnimationSampler}. Samplers must be attached to an {@link Animation}
     * for use and export; they are not otherwise associated with a {@link Root}.
     */
    createAnimationSampler(name?: string): AnimationSampler;
    /** Creates a new {@link Accessor} attached to this document's {@link Root}. */
    createAccessor(name?: string, buffer?: Buffer | null): Accessor;
    /** Creates a new {@link Buffer} attached to this document's {@link Root}. */
    createBuffer(name?: string): Buffer;
}
