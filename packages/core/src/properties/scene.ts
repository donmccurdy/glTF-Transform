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

	@GraphChildList private nodes: Link<Scene, Node>[] = [];

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this.clearGraphChildList(this.nodes);
		other.nodes.forEach((link) => this.addNode(resolve(link.getChild())));

		return this;
	}

	/** Adds a {@link Node} to the scene. */
	public addNode(node: Node): this {
		return this.addGraphChild(this.nodes, this.graph.link('node', this, node));
	}

	/** Removes a {@link Node} from the scene. */
	public removeNode(node: Node): this {
		return this.removeGraphChild(this.nodes, node);
	}

	/** Lists all root {@link Node}s in the scene. */
	public listNodes(): Node[] {
		return this.nodes.map((p) => p.getChild());
	}

	/** Visits each {@link Node} in the scene, including descendants, top-down. */
	public traverse(fn: (node: Node) => void): this {
		for (const node of this.listNodes()) node.traverse(fn);
		return this;
	}
}
