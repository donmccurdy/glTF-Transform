import { PropertyType, vec3, vec4 } from '../constants';
import { GraphChild, GraphChildList } from '../graph/graph-decorators';
import { Link } from '../graph/graph-links';
import { Camera } from './camera';
import { ExtensibleProperty } from './extensible-property';
import { Mesh } from './mesh';
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

	@GraphChild private camera: Link<Node, Camera> = null;
	@GraphChild private mesh: Link<Node, Mesh> = null;
	@GraphChild private skin: Link<Node, Skin> = null;
	@GraphChildList private children: Link<Node, Node>[] = [];

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

	/** Adds another node as a child of this one. Nodes cannot have multiple parents. */
	public addChild(child: Node): this {
		const link = this.graph.link('child', this, child);
		return this.addGraphChild(this.children, link);
	}

	/** Removes a node from this node's child node list. */
	public removeChild(child: Node): this {
		return this.removeGraphChild(this.children, child);
	}

	/** Lists all child nodes of this node. */
	public listChildren(): Node[] {
		return this.children.map((link) => link.getChild());
	}

	/** Returns the {@link Mesh}, if any, instantiated at this node. */
	public getMesh(): Mesh { return this.mesh ? this.mesh.getChild() : null; }

	/**
	 * Sets a {@link Mesh} to be instantiated at this node. A single mesh may be instatiated by
	 * multiple nodes; reuse of this sort is strongly encouraged.
	 */
	public setMesh(mesh: Mesh): this {
		this.mesh = this.graph.link('mesh', this, mesh);
		return this;
	}

	/** Returns the {@link Camera}, if any, instantiated at this node. */
	public getCamera(): Camera { return this.camera ? this.camera.getChild() : null; }

	/** Sets a {@link Camera} to be instantiated at this node. */
	public setCamera(camera: Camera): this {
		this.camera = this.graph.link('camera', this, camera);
		return this;
	}

	/** Returns the {@link Skin}, if any, instantiated at this node. */
	public getSkin(): Skin { return this.skin ? this.skin.getChild() : null; }

	/** Sets a {@link Skin} to be instantiated at this node. */
	public setSkin(skin: Skin): this {
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
}
