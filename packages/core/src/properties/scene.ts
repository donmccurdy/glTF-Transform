import { $attributes } from 'property-graph';
import { Nullable, PropertyType } from '../constants.js';
import { ExtensibleProperty, IExtensibleProperty } from './extensible-property.js';
import type { Node } from './node.js';
import { COPY_IDENTITY } from './property.js';

interface IScene extends IExtensibleProperty {
	children: Node[];
}

/**
 * *Scenes represent a set of visual objects to render.*
 *
 * Typically a glTF file contains only a single Scene, although more are allowed and useful in some
 * cases. No particular meaning is associated with additional Scenes, except as defined by the
 * application. Scenes reference {@link Node}s, and a single Node cannot be a member of more than
 * one Scene.
 *
 * References:
 * - [glTF → Scenes](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#scenes)
 * - [glTF → Coordinate System and Units](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#coordinate-system-and-units)
 *
 * @category Properties
 */
export class Scene extends ExtensibleProperty<IScene> {
	public declare propertyType: PropertyType.SCENE;

	protected init(): void {
		this.propertyType = PropertyType.SCENE;
	}

	protected getDefaults(): Nullable<IScene> {
		return Object.assign(super.getDefaults() as IExtensibleProperty, { children: [] });
	}

	public copy(other: this, resolve = COPY_IDENTITY): this {
		// Scene cannot be copied, only cloned. Copying is shallow, but nodes cannot have more than
		// one parent. Rather than leaving one of the two Scenes without children, throw an error here.
		if (resolve === COPY_IDENTITY) throw new Error('Scene cannot be copied.');
		return super.copy(other, resolve);
	}

	/**
	 * Adds a {@link Node} to the Scene.
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
	public addChild(node: Node): this {
		// Remove existing parent.
		if (node._parentNode) node._parentNode.removeChild(node);

		// Edge in graph.
		this.addRef('children', node);

		// Set new parent.
		// TODO(cleanup): Avoid reaching into $attributes.
		node._parentScenes.add(this);
		const childrenRefs = this[$attributes]['children'];
		const ref = childrenRefs[childrenRefs.length - 1];
		ref.addEventListener('dispose', () => node._parentScenes.delete(this));
		return this;
	}

	/** Removes a {@link Node} from the Scene. */
	public removeChild(node: Node): this {
		return this.removeRef('children', node);
	}

	/**
	 * Lists all direct child {@link Node Nodes} in the Scene. Indirect
	 * descendants (children of children) are not returned, but may be
	 * reached recursively or with {@link Scene.traverse} instead.
	 */
	public listChildren(): Node[] {
		return this.listRefs('children');
	}

	/** Visits each {@link Node} in the Scene, including descendants, top-down. */
	public traverse(fn: (node: Node) => void): this {
		for (const node of this.listChildren()) node.traverse(fn);
		return this;
	}
}
