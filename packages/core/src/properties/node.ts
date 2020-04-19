import { vec3, vec4 } from '../constants';
import { GraphChild, GraphChildList } from '../graph/graph-decorators';
import { Link } from '../graph/graph-links';
import { Mesh } from './mesh';
import { Property } from './property';
import { Root } from './root';

/**
 * @category Properties
 */
export class Node extends Property {
	private translation: vec3 = [0, 0, 0];
	private rotation: vec4 = [0, 0, 0, 1];
	private scale: vec3 = [1, 1, 1];

	@GraphChild private mesh: Link<Node, Mesh> = null;
	@GraphChildList private children: Link<Node, Node>[] = [];

	public getTranslation(): vec3 { return this.translation; }
	public getRotation(): vec4 { return this.rotation; }
	public getScale(): vec3 { return this.scale; }

	public setTranslation(translation: vec3): Node {
		this.translation = translation;
		return this;
	}
	public setRotation(rotation: vec4): Node {
		this.rotation = rotation;
		return this;
	}
	public setScale(scale: vec3): Node {
		this.scale = scale;
		return this;
	}

	public addChild(child: Node): Node {
		const link = this.graph.link('child', this, child) as Link<Root, Node>;
		return this.addGraphChild(this.children, link) as Node;
	}
	public removeChild(child: Node): Node {
		return this.removeGraphChild(this.children, child) as Node;
	}
	public listChildren(): Node[] {
		return this.children.map((link) => link.getChild());
	}
	public setMesh(mesh: Mesh): Node {
		this.mesh = this.graph.link('mesh', this, mesh) as Link<Node, Mesh>;
		return this;
	}
	public getMesh(): Mesh { return this.mesh ? this.mesh.getChild() : null; }
}
