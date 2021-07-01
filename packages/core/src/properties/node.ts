import { multiply } from 'gl-matrix/mat4';
import { PropertyType, mat4, vec3, vec4 } from '../constants';
import { GraphChild, GraphChildList } from '../graph/graph-decorators';
import { Link } from '../graph/graph-links';
import { MathUtils } from '../utils';
import { Camera } from './camera';
import { ExtensibleProperty } from './extensible-property';
import { Mesh } from './mesh';
import { COPY_IDENTITY } from './property';
import { Skin } from './skin';

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
export class Node extends ExtensibleProperty {
	public readonly propertyType = PropertyType.NODE;
	private _translation: vec3 = [0, 0, 0];
	private _rotation: vec4 = [0, 0, 0, 1];
	private _scale: vec3 = [1, 1, 1];
	private _weights: number[] = [];

	/** @internal Internal reference to node's parent, omitted from {@link Graph}. */
	public _parent: SceneNode | null = null;

	@GraphChild private camera: Link<Node, Camera> | null = null;
	@GraphChild private mesh: Link<Node, Mesh> | null = null;
	@GraphChild private skin: Link<Node, Skin> | null = null;
	@GraphChildList private children: Link<Node, Node>[] = [];

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this._translation = [...other._translation] as vec3;
		this._rotation = [...other._rotation] as vec4;
		this._scale = [...other._scale] as vec3;
		this._weights = [...other._weights];

		this.setCamera(other.camera ? resolve(other.camera.getChild()) : null);
		this.setMesh(other.mesh ? resolve(other.mesh.getChild()) : null);
		this.setSkin(other.skin ? resolve(other.skin.getChild()) : null);

		if (resolve !== COPY_IDENTITY) {
			this.clearGraphChildList(this.children);
			other.children.forEach((link) => this.addChild(resolve(link.getChild())));
		}

		return this;
	}

	/**********************************************************************************************
	 * Local transform.
	 */

	/** Returns the translation (position) of this node in local space. */
	public getTranslation(): vec3 { return this._translation; }

	/** Returns the rotation (quaternion) of this node in local space. */
	public getRotation(): vec4 { return this._rotation; }

	/** Returns the scale of this node in local space. */
	public getScale(): vec3 { return this._scale; }

	/** Sets the translation (position) of this node in local space. */
	public setTranslation(translation: vec3): this {
		this._translation = translation;
		return this;
	}

	/** Sets the rotation (quaternion) of this node in local space. */
	public setRotation(rotation: vec4): this {
		this._rotation = rotation;
		return this;
	}

	/** Sets the scale of this node in local space. */
	public setScale(scale: vec3): this {
		this._scale = scale;
		return this;
	}

	/** Returns the local matrix of this node. */
	public getMatrix(): mat4 {
		return MathUtils.compose(
			this._translation, this._rotation, this._scale, [] as unknown as mat4
		);
	}

	/** Sets the local matrix of this node. Matrix will be decomposed to TRS properties. */
	public setMatrix(matrix: mat4): this {
		MathUtils.decompose(matrix, this._translation, this._rotation, this._scale);
		return this;
	}

	/**********************************************************************************************
	 * World transform.
	 */

	/** Returns the translation (position) of this node in world space. */
	public getWorldTranslation(): vec3 {
		const t = [0, 0, 0] as vec3;
		MathUtils.decompose(this.getWorldMatrix(), t, [0, 0, 0, 1], [1, 1, 1]);
		return t;
	}

	/** Returns the rotation (quaternion) of this node in world space. */
	public getWorldRotation(): vec4 {
		const r = [0, 0, 0, 1] as vec4;
		MathUtils.decompose(this.getWorldMatrix(), [0, 0, 0], r, [1, 1, 1]);
		return r;
	}

	/** Returns the scale of this node in world space. */
	public getWorldScale(): vec3 {
		const s = [1, 1, 1] as vec3;
		MathUtils.decompose(this.getWorldMatrix(), [0, 0, 0], [0, 0, 0, 1], s);
		return s;
	}

	/** Returns the world matrix of this node. */
	public getWorldMatrix(): mat4 {
		// Build ancestor chain.
		const ancestors: Node[] = [];
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		for (let node: SceneNode | null = this; node instanceof Node; node = node._parent) {
			ancestors.push(node);
		}

		// Compute world matrix.
		let ancestor: Node | undefined;
		const worldMatrix = ancestors.pop()!.getMatrix();
		while ((ancestor = ancestors.pop())) {
			multiply(worldMatrix, worldMatrix, ancestor.getMatrix());
		}

		return worldMatrix;
	}

	/**********************************************************************************************
	 * Scene hierarchy.
	 */

	/** Adds another node as a child of this one. Nodes cannot have multiple parents. */
	public addChild(child: Node): this {
		// Remove existing parent.
		if (child._parent) child._parent.removeChild(child);

		// Link in graph.
		const link = this.graph.link('child', this, child);
		this.addGraphChild(this.children, link);

		// Set new parent.
		child._parent = this;
		link.onDispose(() => child._parent = null);
		return this;
	}

	/** Removes a node from this node's child node list. */
	public removeChild(child: Node): this {
		return this.removeGraphChild(this.children, child);
	}

	/** Lists all child nodes of this node. */
	public listChildren(): Node[] {
		return this.children.map((link) => link.getChild());
	}

	/**
	 * Returns the unique parent ({@link Scene}, {@link Node}, or null) of this node in the scene
	 * hierarchy. Unrelated to {@link Property.listParents}, which lists all resource references.
	 */
	public getParent(): SceneNode | null {
		return this._parent;
	}

	/**********************************************************************************************
	 * Attachments.
	 */

	/** Returns the {@link Mesh}, if any, instantiated at this node. */
	public getMesh(): Mesh | null { return this.mesh ? this.mesh.getChild() : null; }

	/**
	 * Sets a {@link Mesh} to be instantiated at this node. A single mesh may be instatiated by
	 * multiple nodes; reuse of this sort is strongly encouraged.
	 */
	public setMesh(mesh: Mesh | null): this {
		this.mesh = this.graph.link('mesh', this, mesh);
		return this;
	}

	/** Returns the {@link Camera}, if any, instantiated at this node. */
	public getCamera(): Camera | null { return this.camera ? this.camera.getChild() : null; }

	/** Sets a {@link Camera} to be instantiated at this node. */
	public setCamera(camera: Camera | null): this {
		this.camera = this.graph.link('camera', this, camera);
		return this;
	}

	/** Returns the {@link Skin}, if any, instantiated at this node. */
	public getSkin(): Skin | null { return this.skin ? this.skin.getChild() : null; }

	/** Sets a {@link Skin} to be instantiated at this node. */
	public setSkin(skin: Skin | null): this {
		this.skin = this.graph.link('skin', this, skin);
		return this;
	}

	/**
	 * Initial weights of each {@link PrimitiveTarget} for the mesh instance at this node.
	 * Most engines only support 4-8 active morph targets at a time.
	 */
	public getWeights(): number[] {
		return this._weights;
	}

	/**
	 * Initial weights of each {@link PrimitiveTarget} for the mesh instance at this node.
	 * Most engines only support 4-8 active morph targets at a time.
	 */
	public setWeights(weights: number[]): this {
		this._weights = weights;
		return this;
	}

	/**********************************************************************************************
	 * Helpers.
	 */

	/** Visits this {@link Node} and its descendants, top-down. */
	public traverse(fn: (node: Node) => void): this {
		fn(this);
		for (const child of this.listChildren()) child.traverse(fn);
		return this;
	}
}

interface SceneNode {
	propertyType: PropertyType;
	_parent?: SceneNode | null;
	addChild(node: Node): this;
	removeChild(node: Node): this;
}
