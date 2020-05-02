import { GraphChildList, Link } from '../graph/index';
import { Node } from './node';
import { Property } from './property';
import { Root } from './root';

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
export class Scene extends Property {
	public readonly propertyType = 'Scene';

	@GraphChildList private nodes: Link<Scene, Node>[] = [];

	/** Adds a {@link Node} to the scene. */
	public addNode(node: Node): Scene {
		return this.addGraphChild(this.nodes, this.graph.link('node', this, node) as Link<Root, Node>) as Scene;
	}

	/** Removes a {@link Node} from the scene. */
	public removeNode(node: Node): Scene {
		return this.removeGraphChild(this.nodes, node) as Scene;
	}

	/** Lists all {@link Node}s in the scene. */
	public listNodes(): Node[] {
		return this.nodes.map((p) => p.getChild());
	}
}
