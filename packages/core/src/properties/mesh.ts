import { NOT_IMPLEMENTED } from '../constants';
import { GraphChild, GraphChildList } from '../graph/index';
import { Link } from '../graph/index';
import { Accessor } from './accessor';
import { Material } from './material';
import { Property } from './property';
import { AttributeLink } from './property-links';
import { Root } from './root';

/**
 * @category Properties
 */
export class Mesh extends Property {
	@GraphChildList private primitives: Link<Mesh, Primitive>[] = [];

	public addPrimitive(primitive: Primitive): Mesh {
		return this.addGraphChild(this.primitives, this.graph.link('primitive', this, primitive) as Link<Root, Primitive>) as Mesh;
	}

	public removePrimitive(primitive: Primitive): Mesh {
		return this.removeGraphChild(this.primitives, primitive) as Mesh;
	}

	public listPrimitives(): Primitive[] {
		return this.primitives.map((p) => p.getChild());
	}
}

/**
 * @category Properties
 */
export class Primitive extends Property {
	private mode: GLTF.MeshPrimitiveMode = GLTF.MeshPrimitiveMode.TRIANGLES;

	@GraphChild private indices: Link<Primitive, Accessor> = null;
	@GraphChildList private attributes: AttributeLink[] = [];
	// @GraphChildList private targets: AttributeLink[][] = [];
	@GraphChild private material: Link<Primitive, Material> = null;

	public getIndices(): Accessor {
		return this.indices ? this.indices.getChild() : null;
	}
	public setIndices(indices: Accessor): Primitive {
		this.indices = this.graph.linkIndex('index', this, indices) as Link<Primitive, Accessor>;
		return this;
	}
	public getAttribute(semantic: string): Accessor {
		const link = this.attributes.find((link) => link.semantic === semantic);
		return link ? link.getChild() : null;
	}
	public setAttribute(semantic: string, accessor: Accessor): Primitive {
		const link = this.graph.linkAttribute(semantic.toLowerCase(), this, accessor) as AttributeLink;
		link.semantic = semantic;
		return this.addGraphChild(this.attributes, link) as Primitive;
	}

	public listAttributes(): Accessor[] {
		return this.attributes.map((link) => link.getChild());
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
	public getMaterial(): Material { return this.material ? this.material.getChild() : null; }
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
