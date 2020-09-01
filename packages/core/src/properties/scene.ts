import { PropertyType } from '../constants';
import { GraphChildList, Link } from '../graph/index';
import { ExtensibleProperty } from './extensible-property';
import { Node } from './node';
import { COPY_IDENTITY } from './property';

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
export class Scene extends ExtensibleProperty {
	public readonly propertyType = PropertyType.SCENE;

	@GraphChildList private children: Link<Scene, Node>[] = [];

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		if (resolve !== COPY_IDENTITY) {
			this.clearGraphChildList(this.children);
			other.children.forEach((link) => this.addChild(resolve(link.getChild())));
		}

		return this;
	}

	/** Adds a {@link Node} to the scene. */
	public addChild(node: Node): this {
		// Remove existing parent.
		if (node._parent) node._parent.removeChild(node);

		// Link in graph.
		const link = this.graph.link('child', this, node);
		this.addGraphChild(this.children, link);

		// Set new parent.
		node._parent = this;
		link.onDispose(() => node._parent = null);
		return this;
	}

	/** Removes a {@link Node} from the scene. */
	public removeChild(node: Node): this {
		return this.removeGraphChild(this.children, node);
	}

	/** Lists all root {@link Node}s in the scene. */
	public listChildren(): Node[] {
		return this.children.map((p) => p.getChild());
	}

	/** Visits each {@link Node} in the scene, including descendants, top-down. */
	public traverse(fn: (node: Node) => void): this {
		for (const node of this.listChildren()) node.traverse(fn);
		return this;
	}
}
