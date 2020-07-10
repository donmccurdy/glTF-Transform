import { PropertyType } from '../constants';
import { GraphChild, GraphChildList } from '../graph/index';
import { Link } from '../graph/index';
import { Accessor } from './accessor';
import { ExtensibleProperty } from './extensible-property';
import { Material } from './material';
import { COPY_IDENTITY, Property } from './property';
import { AttributeLink } from './property-links';

/**
 * # Mesh
 *
 * *Meshes define reusable geometry (triangles, lines, or points) and are instantiated by
 * {@link Node}s.*
 *
 * Each draw call required to render a mesh is represented as a {@link Primitive}. Meshes typically
 * have only a single {@link Primitive}, but may have more for various reasons. A mesh manages only
 * a list of primitives — materials, morph targets, and other properties are managed on a per-
 * primitive basis.
 *
 * When the same geometry and material should be rendered at multiple places in the scene, reuse
 * the same Mesh instance and attach it to multiple nodes for better efficiency. Where the geometry
 * is shared but the material is not, reusing {@link Accessor}s under different meshes and
 * primitives can similarly improve transmission efficiency, although some rendering efficiency is
 * lost as the number of materials in a scene increases.
 *
 * Usage:
 *
 * ```ts
 * const primitive = doc.createPrimitive()
 * 	.setAttribute('POSITION', positionAccessor)
 * 	.setAttribute('TEXCOORD_0', uvAccessor);
 * const mesh = doc.createMesh('myMesh')
 * 	.addPrimitive(primitive);
 * node.setMesh(mesh);
 * ```
 *
 * References:
 * - [glTF → Geometry](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#geometry)
 *
 * @category Properties
 */
export class Mesh extends ExtensibleProperty {
	public readonly propertyType = PropertyType.MESH;

	private _weights: number[] = [];

	/** Primitive GPU draw call list. */
	@GraphChildList private primitives: Link<Mesh, Primitive>[] = [];

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this._weights = [...other._weights];

		this.clearGraphChildList(this.primitives);
		other.primitives.forEach((link) => this.addPrimitive(resolve(link.getChild())));

		return this;
	}

	/** Adds a {@link Primitive} to the mesh's draw call list. */
	public addPrimitive(primitive: Primitive): this {
		return this.addGraphChild(this.primitives, this.graph.link('primitive', this, primitive));
	}

	/** Removes a {@link Primitive} from the mesh's draw call list. */
	public removePrimitive(primitive: Primitive): this {
		return this.removeGraphChild(this.primitives, primitive);
	}

	/** Lists {@link Primitive} draw calls of the mesh. */
	public listPrimitives(): Primitive[] {
		return this.primitives.map((p) => p.getChild());
	}

	/**
	 * Initial weights of each {@link PrimitiveTarget} on this mesh. Each {@link Primitive} must
	 * have the same number of targets. Most engines only support 4-8 active morph targets at a
	 * time.
	 */
	public getWeights(): number[] {
		return this._weights;
	}

	/**
	 * Initial weights of each {@link PrimitiveTarget} on this mesh. Each {@link Primitive} must
	 * have the same number of targets. Most engines only support 4-8 active morph targets at a
	 * time.
	 */
	public setWeights(weights: number[]): this {
		this._weights = weights;
		return this;
	}
}

/**
 * # Primitive
 *
 * *Primitives are individual GPU draw calls comprising a {@link Mesh}.*
 *
 * Meshes typically have only a single Primitive, although various cases may require more. Each
 * primitive may be assigned vertex attributes, morph target attributes, and a material. Any of
 * these properties should be reused among multiple primitives where feasible.
 *
 * Primitives cannot be moved independently of other primitives within the same mesh, except
 * through the use of morph targets and skinning. If independent movement or other runtime
 * behavior is necessary (like raycasting or collisions) prefer to assign each primitive to a
 * different mesh. The number of GPU draw calls is typically not unaffected by grouping or
 * ungrouping primitives to a mesh.
 *
 * Each primitive may optionally be deformed by one or more morph targets, stored in a
 * {@link PrimitiveTarget}.
 *
 * Usage:
 *
 * ```ts
 * const primitive = doc.createPrimitive()
 * 	.setAttribute('POSITION', positionAccessor)
 * 	.setAttribute('TEXCOORD_0', uvAccessor)
 * 	.setMaterial(material);
 * mesh.addPrimitive(primitive);
 * node.setMesh(mesh);
 * ```
 *
 * References:
 * - [glTF → Geometry](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#geometry)
 *
 * @category Properties
 */
export class Primitive extends Property {
	public readonly propertyType = PropertyType.PRIMITIVE;

	/** GPU draw mode. */
	private _mode: GLTF.MeshPrimitiveMode = GLTF.MeshPrimitiveMode.TRIANGLES;

	@GraphChild private material: Link<Primitive, Material> = null;
	@GraphChild private indices: Link<Primitive, Accessor> = null;
	@GraphChildList private attributes: AttributeLink[] = [];
	@GraphChildList private targets: Link<Primitive, PrimitiveTarget>[] = [];

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this._mode = other._mode;

		if (other.indices) this.setIndices(resolve(other.indices.getChild()));
		if (other.material) this.setMaterial(resolve(other.material.getChild()));

		this.clearGraphChildList(this.attributes);
		other.listSemantics().forEach((semantic) => {
			this.setAttribute(semantic, resolve(other.getAttribute(semantic)));
		});

		this.clearGraphChildList(this.targets);
		other.targets.forEach((link) => this.addTarget(resolve(link.getChild())));

		return this;
	}

	/** Returns an {@link Accessor} with indices of vertices to be drawn. */
	public getIndices(): Accessor {
		return this.indices ? this.indices.getChild() : null;
	}

	/**
	 * Sets an {@link Accessor} with indices of vertices to be drawn. In `TRIANGLES` draw mode,
	 * each set of three indices define a triangle. The front face has a counter-clockwise (CCW)
	 * winding order.
	 */
	public setIndices(indices: Accessor): this {
		this.indices = this.graph.linkIndex('index', this, indices);
		return this;
	}

	/** Returns a vertex attribute as an {@link Accessor}. */
	public getAttribute(semantic: string): Accessor {
		const link = this.attributes.find((link) => link.semantic === semantic);
		return link ? link.getChild() : null;
	}

	/**
	 * Sets a vertex attribute to an {@link Accessor}. All attributes must have the same vertex
	 * count.
	 */
	public setAttribute(semantic: string, accessor: Accessor): this {
		// Remove previous attribute.
		const prevAccessor = this.getAttribute(semantic);
		if (prevAccessor) this.removeGraphChild(this.attributes, prevAccessor);

		// Stop if deleting the attribute.
		if (!accessor) return this;

		// Add next attribute.
		const link = this.graph.linkAttribute(semantic.toLowerCase(), this, accessor) as AttributeLink;
		link.semantic = semantic;
		return this.addGraphChild(this.attributes, link);
	}

	/**
	 * Lists all vertex attribute {@link Accessor}s associated with the primitive, excluding any
	 * attributes used for morph targets. For example, `[positionAccessor, normalAccessor,
	 * uvAccessor]`. Order will be consistent with the order returned by {@link .listSemantics}().
	 */
	public listAttributes(): Accessor[] {
		return this.attributes.map((link) => link.getChild());
	}

	/**
	 * Lists all vertex attribute semantics associated with the primitive, excluding any semantics
	 * used for morph targets. For example, `['POSITION', 'NORMAL', 'TEXCOORD_0']`. Order will be
	 * consistent with the order returned by {@link .listAttributes}().
	 */
	public listSemantics(): string[] {
		return this.attributes.map((link) => link.semantic);
	}

	/** Returns the material used to render the primitive. */
	public getMaterial(): Material { return this.material ? this.material.getChild() : null; }

	/** Sets the material used to render the primitive. */
	public setMaterial(material: Material): this {
		this.material = this.graph.link('material', this, material);
		return this;
	}

	/**
	 * Returns the GPU draw mode (`TRIANGLES`, `LINES`, `POINTS`...) as a WebGL enum value.
	 *
	 * Reference:
	 * - [glTF → `primitive.mode`](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#primitivemode)
	 */
	public getMode(): GLTF.MeshPrimitiveMode { return this._mode; }

	/**
	 * Sets the GPU draw mode (`TRIANGLES`, `LINES`, `POINTS`...) as a WebGL enum value.
	 *
	 * Reference:
	 * - [glTF → `primitive.mode`](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#primitivemode)
	 */
	public setMode(mode: GLTF.MeshPrimitiveMode): this {
		this._mode = mode;
		return this;
	}

	/** Lists all morph targets associated with the primitive. */
	public listTargets(): PrimitiveTarget[] {
		return this.targets.map((link) => link.getChild());
	}

	/**
	 * Adds a morph target to the primitive. All primitives in the same mesh must have the same
	 * number of targets.
	 */
	public addTarget(target: PrimitiveTarget): this {
		this.addGraphChild(this.targets, this.graph.link('target', this, target));
		return this;
	}

	/**
	 * Removes a morph target from the primitive. All primitives in the same mesh must have the same
	 * number of targets.
	 */
	public removeTarget(target: PrimitiveTarget): this {
		return this.removeGraphChild(this.targets, target);
	}
}

/**
 * # PrimitiveTarget
 *
 * *Morph target or shape key used to deform one {@link Primitive} in a {@link Mesh}.*
 *
 * A PrimitiveTarget contains a `POSITION` attribute (and optionally `NORMAL` and `TANGENT`) that
 * can additively deform the base attributes on a {@link Mesh} {@link Primitive}. Vertex values
 * of `0, 0, 0` in the target will have no effect, whereas a value of `0, 1, 0` would offset that
 * vertex in the base geometry by y+=1. Morph targets can be fully or partially applied: their
 * default state is controlled by {@link Mesh.getWeights}, which can also be overridden for a
 * particular instantiation of a {@link Mesh}, using {@link Node.getWeights}.
 *
 * Reference:
 * - [glTF → Morph Targets](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#morph-targets)
 */
export class PrimitiveTarget extends Property {
	public readonly propertyType = PropertyType.PRIMITIVE_TARGET;

	/** Vertex attributes. */
	@GraphChildList private attributes: AttributeLink[] = [];

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this.clearGraphChildList(this.attributes);
		other.listSemantics().forEach((semantic) => {
			this.setAttribute(semantic, resolve(other.getAttribute(semantic)));
		});

		return this;
	}

	/** Returns a morph target vertex attribute as an {@link Accessor}. */
	public getAttribute(semantic: string): Accessor {
		const link = this.attributes.find((link) => link.semantic === semantic);
		return link ? link.getChild() : null;
	}

	/**
	 * Sets a morph target vertex attribute to an {@link Accessor}.
	 */
	public setAttribute(semantic: string, accessor: Accessor): this {
		// Remove previous attribute.
		const prevAccessor = this.getAttribute(semantic);
		if (prevAccessor) this.removeGraphChild(this.attributes, prevAccessor);

		// Stop if deleting the attribute.
		if (!accessor) return this;

		// Add next attribute.
		const link = this.graph.linkAttribute(semantic.toLowerCase(), this, accessor) as AttributeLink;
		link.semantic = semantic;
		return this.addGraphChild(this.attributes, link);
	}

	/**
	 * Lists all morph target vertex attribute {@link Accessor}s associated. Order will be
	 * consistent with the order returned by {@link .listSemantics}().
	 */
	public listAttributes(): Accessor[] {
		return this.attributes.map((link) => link.getChild());
	}

	/**
	 * Lists all morph target vertex attribute semantics associated. Order will be
	 * consistent with the order returned by {@link .listAttributes}().
	 */
	public listSemantics(): string[] {
		return this.attributes.map((link) => link.semantic);
	}
}
