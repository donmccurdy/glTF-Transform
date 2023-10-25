import { multiply } from 'gl-matrix/mat4';
import { PropertyType, mat4, vec3, vec4, Nullable } from '../constants.js';
import { RefSet } from 'property-graph';
import { MathUtils } from '../utils/index.js';
import type { Camera } from './camera.js';
import { ExtensibleProperty, IExtensibleProperty } from './extensible-property.js';
import type { Mesh } from './mesh.js';
import { COPY_IDENTITY } from './property.js';
import type { Skin } from './skin.js';
import type { Scene } from './scene.js';

interface INode extends IExtensibleProperty {
	translation: vec3;
	rotation: vec4;
	scale: vec3;
	weights: number[];
	camera: Camera;
	mesh: Mesh;
	skin: Skin;
	children: RefSet<Node>;
}

/**
 * *Nodes are the objects that comprise a {@link Scene}.*
 *
 * Each Node may have one or more children, and a transform (position, rotation, and scale) that
 * applies to all of its descendants. A Node may also reference (or "instantiate") other resources
 * at its location, including {@link Mesh}, Camera, Light, and Skin properties. A Node cannot be
 * part of more than one {@link Scene}.
 *
 * A Node's local transform is represented with array-like objects, intended to be compatible with
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
 * - [glTF → Nodes and Hierarchy](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#nodes-and-hierarchy)
 *
 * @category Properties
 */
export class Node extends ExtensibleProperty<INode> {
	public declare propertyType: PropertyType.NODE;

	protected init(): void {
		this.propertyType = PropertyType.NODE;
	}

	protected getDefaults(): Nullable<INode> {
		return Object.assign(super.getDefaults() as IExtensibleProperty, {
			translation: [0, 0, 0] as vec3,
			rotation: [0, 0, 0, 1] as vec4,
			scale: [1, 1, 1] as vec3,
			weights: [],
			camera: null,
			mesh: null,
			skin: null,
			children: new RefSet<Node>(),
		});
	}

	public copy(other: this, resolve = COPY_IDENTITY): this {
		// Node cannot be copied, only cloned. Copying is shallow, but Nodes cannot have more than
		// one parent. Rather than leaving one of the two Nodes without children, throw an error here.
		if (resolve === COPY_IDENTITY) throw new Error('Node cannot be copied.');
		return super.copy(other, resolve);
	}

	/**********************************************************************************************
	 * Local transform.
	 */

	/** Returns the translation (position) of this Node in local space. */
	public getTranslation(): vec3 {
		return this.get('translation');
	}

	/** Returns the rotation (quaternion) of this Node in local space. */
	public getRotation(): vec4 {
		return this.get('rotation');
	}

	/** Returns the scale of this Node in local space. */
	public getScale(): vec3 {
		return this.get('scale');
	}

	/** Sets the translation (position) of this Node in local space. */
	public setTranslation(translation: vec3): this {
		return this.set('translation', translation);
	}

	/** Sets the rotation (quaternion) of this Node in local space. */
	public setRotation(rotation: vec4): this {
		return this.set('rotation', rotation);
	}

	/** Sets the scale of this Node in local space. */
	public setScale(scale: vec3): this {
		return this.set('scale', scale);
	}

	/** Returns the local matrix of this Node. */
	public getMatrix(): mat4 {
		return MathUtils.compose(
			this.get('translation'),
			this.get('rotation'),
			this.get('scale'),
			[] as unknown as mat4,
		);
	}

	/** Sets the local matrix of this Node. Matrix will be decomposed to TRS properties. */
	public setMatrix(matrix: mat4): this {
		const translation = this.get('translation').slice() as vec3;
		const rotation = this.get('rotation').slice() as vec4;
		const scale = this.get('scale').slice() as vec3;
		MathUtils.decompose(matrix, translation, rotation, scale);
		return this.set('translation', translation).set('rotation', rotation).set('scale', scale);
	}

	/**********************************************************************************************
	 * World transform.
	 */

	/** Returns the translation (position) of this Node in world space. */
	public getWorldTranslation(): vec3 {
		const t = [0, 0, 0] as vec3;
		MathUtils.decompose(this.getWorldMatrix(), t, [0, 0, 0, 1], [1, 1, 1]);
		return t;
	}

	/** Returns the rotation (quaternion) of this Node in world space. */
	public getWorldRotation(): vec4 {
		const r = [0, 0, 0, 1] as vec4;
		MathUtils.decompose(this.getWorldMatrix(), [0, 0, 0], r, [1, 1, 1]);
		return r;
	}

	/** Returns the scale of this Node in world space. */
	public getWorldScale(): vec3 {
		const s = [1, 1, 1] as vec3;
		MathUtils.decompose(this.getWorldMatrix(), [0, 0, 0], [0, 0, 0, 1], s);
		return s;
	}

	/** Returns the world matrix of this Node. */
	public getWorldMatrix(): mat4 {
		// Build ancestor chain.
		const ancestors: Node[] = [];
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		for (let node: Node | null = this; node != null; node = node.getParentNode()) {
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

	/**
	 * Adds the given Node as a child of this Node.
	 *
	 * Requirements:
	 *
	 * 1. Nodes MAY be root children of multiple {@link Scene Scenes}
	 * 2. Nodes MUST NOT be children of >1 Node
	 * 3. Nodes MUST NOT be children of both Nodes and {@link Scene Scenes}
	 *
	 * The `addChild` method enforces these restrictions automatically, and will
	 * remove the new child from previous parents where needed. This behavior
	 * may change in future major releases of the library.
	 *
	 * @privateRemarks Requires non-graph state.
	 */
	public addChild(child: Node): this {
		// Remove existing parents.
		const parentNode = child.getParentNode();
		if (parentNode) parentNode.removeChild(child);
		for (const scene of child.listParentScenes()) {
			scene.removeChild(child);
		}

		// Edge in graph.
		return this.addRef('children', child);
	}

	/** Removes a Node from this Node's child Node list. */
	public removeChild(child: Node): this {
		return this.removeRef('children', child);
	}

	/** Lists all child Nodes of this Node. */
	public listChildren(): Node[] {
		return this.listRefs('children');
	}

	/**
	 * Returns the Node's unique parent Node within the scene graph. If the
	 * Node has no parents, or is a direct child of the {@link Scene}
	 * ("root node"), this method returns null.
	 *
	 * Unrelated to {@link Property.listParents}, which lists all resource
	 * references from properties of any type ({@link Skin}, {@link Root}, ...).
	 */
	public getParentNode(): Node | null {
		const parentNode = this.listParents().find((parent) => parent.propertyType === PropertyType.NODE);
		return (parentNode || null) as Node | null;
	}

	/**
	 * Finds the parent {@link Scene Scenes} associated with the given {@link Node}.
	 * In most cases a Node is associated with only one Scene, but it is possible
	 * for a Node to be located in two or more Scenes, or none at all.
	 */
	public listParentScenes(): Scene[] {
		const visited = new Set<Node>();

		let child = this as Node;
		let parent: Node | null;

		while ((parent = child.getParentNode() as Node | null)) {
			if (visited.has(parent)) {
				throw new Error('Circular dependency in scene graph.');
			}
			visited.add(parent);
			child = parent;
		}

		return child.listParents().filter((parent) => parent.propertyType === PropertyType.SCENE) as Scene[];
	}

	/**********************************************************************************************
	 * Attachments.
	 */

	/** Returns the {@link Mesh}, if any, instantiated at this Node. */
	public getMesh(): Mesh | null {
		return this.getRef('mesh');
	}

	/**
	 * Sets a {@link Mesh} to be instantiated at this Node. A single mesh may be instatiated by
	 * multiple Nodes; reuse of this sort is strongly encouraged.
	 */
	public setMesh(mesh: Mesh | null): this {
		return this.setRef('mesh', mesh);
	}

	/** Returns the {@link Camera}, if any, instantiated at this Node. */
	public getCamera(): Camera | null {
		return this.getRef('camera');
	}

	/** Sets a {@link Camera} to be instantiated at this Node. */
	public setCamera(camera: Camera | null): this {
		return this.setRef('camera', camera);
	}

	/** Returns the {@link Skin}, if any, instantiated at this Node. */
	public getSkin(): Skin | null {
		return this.getRef('skin');
	}

	/** Sets a {@link Skin} to be instantiated at this Node. */
	public setSkin(skin: Skin | null): this {
		return this.setRef('skin', skin);
	}

	/**
	 * Initial weights of each {@link PrimitiveTarget} for the mesh instance at this Node.
	 * Most engines only support 4-8 active morph targets at a time.
	 */
	public getWeights(): number[] {
		return this.get('weights');
	}

	/**
	 * Initial weights of each {@link PrimitiveTarget} for the mesh instance at this Node.
	 * Most engines only support 4-8 active morph targets at a time.
	 */
	public setWeights(weights: number[]): this {
		return this.set('weights', weights);
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
