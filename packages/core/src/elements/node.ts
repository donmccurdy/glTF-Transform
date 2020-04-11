import { GraphChild, GraphChildList } from "../graph/graph-decorators";
import { Link } from "../graph/graph-links";
import { Vector3, Vector4 } from "../math";
import { Element } from "./element";
import { Mesh } from "./mesh";
import { Root } from "./root";

export class Node extends Element {
    private translation = new Vector3();
    private rotation = new Vector4();
    private scale = new Vector3();

    @GraphChild private mesh: Link<Node, Mesh> = null;
    @GraphChildList private children: Link<Node, Node>[] = [];

    public getTranslation(): Vector3 { return this.translation; }
    public getRotation(): Vector3 { return this.rotation; }
    public getScale(): Vector3 { return this.scale; }

    public setTranslation(translation: Vector3): Node {
        this.translation = translation;
        return this;
    }
    public setRotation(rotation: Vector4): Node {
        this.rotation = rotation;
        return this;
    }
    public setScale(scale: Vector3): Node {
        this.scale = scale;
        return this;
    }

    public addChild(child: Node): Node {
        return this.addGraphChild(this.children, this.graph.link('child', this, child) as Link<Root, Node>) as Node;
    }
    public removeChild(child: Node): Node {
        return this.removeGraphChild(this.children, child) as Node;
    }
    public listChildren(): Node[] {
        return this.children.map((link) => link.getRight());
    }
    public setMesh(mesh: Mesh): Node {
        this.mesh = this.graph.link('mesh', this, mesh) as Link<Node, Mesh>;
        return this;
    }
    public getMesh(): Mesh { return this.mesh ? this.mesh.getRight() : null; }
}
