import { PropertyType, mat4, vec3, vec4, Nullable } from '../constants';
import { Camera } from './camera';
import { ExtensibleProperty, IExtensibleProperty } from './extensible-property';
import { Mesh } from './mesh';
import { Skin } from './skin';
interface INode extends IExtensibleProperty {
    translation: vec3;
    rotation: vec4;
    scale: vec3;
    weights: number[];
    camera: Camera;
    mesh: Mesh;
    skin: Skin;
    children: Node[];
}
/**
 * # Node
 *
 * *Nodes are the objects that comprise a {@link Scene}.*
 *
 * Each node may have one or more children, and a transform (position, rotation, and scale) that
 * applies to all of its descendants. A node may also reference (or "instantiate") other resources
 * at its location, including {@link Mesh}, Camera, Light, and Skin properties. A node cannot be
 * part of more than one {@link Scene}.
 *
 * A node's local transform is represented with array-like objects, intended to be compatible with
 * [gl-matrix](https://github.com/toji/gl-matrix), or with the `toArray`/`fromArray` methods of
 * libraries like three.js and babylon.js.
 *
 * Usage:
 *
 * ```ts
 * const node = doc.createNode('myNode')
 * 	.setMesh(mesh)
 * 	.setTranslation([0, 0, 0])
 * 	.addChild(otherNode);
 * ```
 *
 * References:
 * - [glTF → Nodes and Hierarchy](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#nodes-and-hierarchy)
 *
 * @category Properties
 */
export declare class Node extends ExtensibleProperty<INode> {
    propertyType: PropertyType.NODE;
    protected init(): void;
    protected getDefaults(): Nullable<INode>;
    copy(other: this, resolve?: <T extends import("./property").Property<import("./property").IProperty>>(t: T) => T): this;
    /**********************************************************************************************
     * Local transform.
     */
    /** Returns the translation (position) of this node in local space. */
    getTranslation(): vec3;
    /** Returns the rotation (quaternion) of this node in local space. */
    getRotation(): vec4;
    /** Returns the scale of this node in local space. */
    getScale(): vec3;
    /** Sets the translation (position) of this node in local space. */
    setTranslation(translation: vec3): this;
    /** Sets the rotation (quaternion) of this node in local space. */
    setRotation(rotation: vec4): this;
    /** Sets the scale of this node in local space. */
    setScale(scale: vec3): this;
    /** Returns the local matrix of this node. */
    getMatrix(): mat4;
    /** Sets the local matrix of this node. Matrix will be decomposed to TRS properties. */
    setMatrix(matrix: mat4): this;
    /**********************************************************************************************
     * World transform.
     */
    /** Returns the translation (position) of this node in world space. */
    getWorldTranslation(): vec3;
    /** Returns the rotation (quaternion) of this node in world space. */
    getWorldRotation(): vec4;
    /** Returns the scale of this node in world space. */
    getWorldScale(): vec3;
    /** Returns the world matrix of this node. */
    getWorldMatrix(): mat4;
    /**********************************************************************************************
     * Scene hierarchy.
     */
    /** Adds another node as a child of this one. Nodes cannot have multiple parents. */
    addChild(child: Node): this;
    /** Removes a node from this node's child node list. */
    removeChild(child: Node): this;
    /** Lists all child nodes of this node. */
    listChildren(): Node[];
    /**
     * Returns the unique parent ({@link Scene}, {@link Node}, or null) of this node in the scene
     * hierarchy. Unrelated to {@link Property.listParents}, which lists all resource references.
     */
    getParent(): SceneNode | null;
    /**********************************************************************************************
     * Attachments.
     */
    /** Returns the {@link Mesh}, if any, instantiated at this node. */
    getMesh(): Mesh | null;
    /**
     * Sets a {@link Mesh} to be instantiated at this node. A single mesh may be instatiated by
     * multiple nodes; reuse of this sort is strongly encouraged.
     */
    setMesh(mesh: Mesh | null): this;
    /** Returns the {@link Camera}, if any, instantiated at this node. */
    getCamera(): Camera | null;
    /** Sets a {@link Camera} to be instantiated at this node. */
    setCamera(camera: Camera | null): this;
    /** Returns the {@link Skin}, if any, instantiated at this node. */
    getSkin(): Skin | null;
    /** Sets a {@link Skin} to be instantiated at this node. */
    setSkin(skin: Skin | null): this;
    /**
     * Initial weights of each {@link PrimitiveTarget} for the mesh instance at this node.
     * Most engines only support 4-8 active morph targets at a time.
     */
    getWeights(): number[];
    /**
     * Initial weights of each {@link PrimitiveTarget} for the mesh instance at this node.
     * Most engines only support 4-8 active morph targets at a time.
     */
    setWeights(weights: number[]): this;
    /**********************************************************************************************
     * Helpers.
     */
    /** Visits this {@link Node} and its descendants, top-down. */
    traverse(fn: (node: Node) => void): this;
}
interface SceneNode {
    propertyType: PropertyType;
    _parent?: SceneNode | null;
    addChild(node: Node): this;
    removeChild(node: Node): this;
}
export {};
