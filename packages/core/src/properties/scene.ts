import { GraphChildList, Link } from '../graph/index';
import { Node } from './node';
import { Property } from './property';
import { Root } from './root';

/**
 * @category Properties
 */
export class Scene extends Property {
	@GraphChildList private nodes: Link<Scene, Node>[] = [];
	public addNode(node: Node): Scene {
		return this.addGraphChild(this.nodes, this.graph.link('node', this, node) as Link<Root, Node>) as Scene;
	}

	public removeNode(node: Node): Scene {
		return this.removeGraphChild(this.nodes, node) as Scene;
	}

	public listNodes(): Node[] {
		return this.nodes.map((p) => p.getChild());
	}
}
