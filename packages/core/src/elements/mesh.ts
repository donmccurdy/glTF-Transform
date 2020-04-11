import { NOT_IMPLEMENTED } from "../constants";
import { GraphChild, GraphChildList } from "../graph/index";
import { Link } from "../graph/index";
import { Accessor } from "./accessor";
import { Element } from "./element";
import { AttributeLink } from "./element-links";
import { Material } from "./material";
import { Root } from "./root";

export class Mesh extends Element {
    @GraphChildList private primitives: Link<Mesh, Primitive>[] = [];

    public addPrimitive(primitive: Primitive): Mesh {
        return this.addGraphChild(this.primitives, this.graph.link('primitive', this, primitive) as Link<Root, Primitive>) as Mesh;
    }

    public removePrimitive(primitive: Primitive): Mesh {
        return this.removeGraphChild(this.primitives, primitive) as Mesh;
    }

    public listPrimitives(): Primitive[] {
        return this.primitives.map((p) => p.getRight());
    }
}

export class Primitive extends Element {
    private mode: GLTF.MeshPrimitiveMode = GLTF.MeshPrimitiveMode.TRIANGLES;
    // TODO(donmccurdy): Kinda feeling like I want an accessors array and a semantics array.
    // private attributeSemantics: {[key: string]: number} = {};
    // private targetSemantics: {[key: string]: number}[] = [];
    // private targets: AttributeMap[] = [];
    // private targetNames: string[] = [];

    @GraphChild private indices: Link<Primitive, Accessor> = null;
    @GraphChildList private attributes: AttributeLink[] = [];
    // @GraphChildList private targets: AttributeLink[][] = [];
    @GraphChild private material: Link<Primitive, Material> = null;

    public getIndices(): Accessor {
        return this.indices ? this.indices.getRight() : null;
    }
    public setIndices(indices: Accessor): Primitive {
        this.indices = this.graph.linkIndex('index', this, indices) as Link<Primitive, Accessor>;
        return this;
    }
    public getAttribute(semantic: string): Accessor {
        const link = this.attributes.find((link) => link.semantic === semantic);
        return link ? link.getRight() : null;
    }
    public setAttribute(semantic: string, accessor: Accessor): Primitive {
        const link = this.graph.linkAttribute(semantic.toLowerCase(), this, accessor) as AttributeLink;
        link.semantic = semantic;
        return this.addGraphChild(this.attributes, link) as Primitive;
    }

    public listAttributes(): Accessor[] {
        return this.attributes.map((link) => link.getRight());
    }

    public listSemantics(): string[] {
        return this.attributes.map((link) => link.semantic);
    }

    public listTargets(): Accessor[][] {
        throw NOT_IMPLEMENTED;
    }
    public listTargetNames(): string[] {
        throw NOT_IMPLEMENTED;
     }
    public getMaterial(): Material { return this.material.getRight(); }
    public setMaterial(material: Material): Primitive {
        this.material = this.graph.link('material', this, material) as Link<Primitive, Material>;
        return this;
    }
    public getMode(): GLTF.MeshPrimitiveMode { return this.mode; }
    public setMode(mode: GLTF.MeshPrimitiveMode): Primitive {
        this.mode = mode;
        return this;
    }
}
