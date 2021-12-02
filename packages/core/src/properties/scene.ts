import { Nullable, PropertyType } from '../constants';
import { $attributes } from '../graph';
import { ExtensibleProperty, IExtensibleProperty } from './extensible-property';
import { Node } from './node';
import { COPY_IDENTITY } from './property';

interface IScene extends IExtensibleProperty {
	children: Node[];
}

/**
 * # Scene
 *
 * *Scenes represent a set of visual objects to render.*
 *
 * Typically a glTF file contains only a single scene, although more are allowed and useful in some
 * cases. No particular meaning is associated with additional scenes, except as defined by the
 * application. Scenes reference {@link Node}s, and a single node cannot be a member of more than
 * one scene.
 *
 * References:
 * - [glTF → Scenes](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#scenes)
 * - [glTF → Coordinate System and Units](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#coordinate-system-and-units)
 *
 * @category Properties
 */
export class Scene extends ExtensibleProperty<IScene> {
	public readonly propertyType = PropertyType.SCENE;

	protected getDefaultAttributes(): Nullable<IScene> {
		return Object.assign(super.getDefaultAttributes(), { children: [] });
	}

	public copy(other: this, resolve = COPY_IDENTITY): this {
		// Scene cannot be cloned in isolation: the cloning process is shallow, but nodes cannot
		// have more than one parent. Rather than leaving one of the two scenes without children,
		// throw an error here.
		if (resolve === COPY_IDENTITY) throw new Error('Scene cannot be copied.');
		return super.copy(other, resolve);
	}

	/** Adds a {@link Node} to the scene. */
	public addChild(node: Node): this {
		// Remove existing parent.
		if (node._parent) node._parent.removeChild(node);

		// Link in graph.
		this.addRef('children', node);

		// Set new parent.
		// TODO(cleanup): Avoid using $attributes here?
		node._parent = this;
		const childrenLinks = this[$attributes]['children'];
		const link = childrenLinks[childrenLinks.length - 1];
		link.onDispose(() => (node._parent = null));
		return this;
	}

	/** Removes a {@link Node} from the scene. */
	public removeChild(node: Node): this {
		return this.removeRef('children', node);
	}

	/** Lists all root {@link Node}s in the scene. */
	public listChildren(): Node[] {
		return this.listRefs('children');
	}

	/** Visits each {@link Node} in the scene, including descendants, top-down. */
	public traverse(fn: (node: Node) => void): this {
		for (const node of this.listChildren()) node.traverse(fn);
		return this;
	}
}
