import { PropertyType } from '../constants';
import { GraphChild, GraphChildList } from '../graph/index';
import { Link } from '../graph/index';
import { GLTF } from '../types/gltf';
import { Accessor } from './accessor';
import { ExtensibleProperty } from './extensible-property';
import { Material } from './material';
import { PrimitiveTarget } from './primitive-target';
import { COPY_IDENTITY } from './property';
import { AttributeLink } from './property-links';

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
 * different mesh. The number of GPU draw calls is typically not affected by grouping or
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
export class Primitive extends ExtensibleProperty {
	public readonly propertyType = PropertyType.PRIMITIVE;

	/**********************************************************************************************
	 * Constants.
	 */

	/** Type of primitives to render. All valid values correspond to WebGL enums. */
	public static Mode: Record<string, GLTF.MeshPrimitiveMode> = {
		/** Draw single points. */
		POINTS: 0,
		/** Draw lines. Each vertex connects to the one after it. */
		LINES: 1,
		/**
		 * Draw lines. Each set of two vertices is treated as a separate line segment.
		 * @deprecated See {@link https://github.com/KhronosGroup/glTF/issues/1883 KhronosGroup/glTF#1883}.
		 */
		LINE_LOOP: 2,
		/** Draw a connected group of line segments from the first vertex to the last,  */
		LINE_STRIP: 3,
		/** Draw triangles. Each set of three vertices creates a separate triangle. */
		TRIANGLES: 4,
		/** Draw a connected strip of triangles. */
		TRIANGLE_STRIP: 5,
		/**
		 * Draw a connected group of triangles. Each vertex connects to the previous and the first
		 * vertex in the fan.
		 * @deprecated See {@link https://github.com/KhronosGroup/glTF/issues/1883 KhronosGroup/glTF#1883}.
		 */
		TRIANGLE_FAN: 6,
	}

	/**********************************************************************************************
	 * Instance.
	 */

	/** @internal GPU draw mode. */
	private _mode: GLTF.MeshPrimitiveMode = Primitive.Mode.TRIANGLES;

	@GraphChild private material: Link<Primitive, Material> | null = null;
	@GraphChild private indices: Link<Primitive, Accessor> | null = null;
	@GraphChildList private attributes: AttributeLink[] = [];
	@GraphChildList private targets: Link<Primitive, PrimitiveTarget>[] = [];

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this._mode = other._mode;

		this.setIndices(other.indices ? resolve(other.indices.getChild()) : null);
		this.setMaterial(other.material ? resolve(other.material.getChild()) : null);

		this.clearGraphChildList(this.attributes);
		other.listSemantics().forEach((semantic) => {
			this.setAttribute(semantic, resolve(other.getAttribute(semantic)!));
		});

		this.clearGraphChildList(this.targets);
		other.targets.forEach((link) => this.addTarget(resolve(link.getChild())));

		return this;
	}

	/**********************************************************************************************
	 * Primitive data.
	 */

	/** Returns an {@link Accessor} with indices of vertices to be drawn. */
	public getIndices(): Accessor | null {
		return this.indices ? this.indices.getChild() : null;
	}

	/**
	 * Sets an {@link Accessor} with indices of vertices to be drawn. In `TRIANGLES` draw mode,
	 * each set of three indices define a triangle. The front face has a counter-clockwise (CCW)
	 * winding order.
	 */
	public setIndices(indices: Accessor | null): this {
		this.indices = this.graph.linkIndex('indices', this, indices);
		return this;
	}

	/** Returns a vertex attribute as an {@link Accessor}. */
	public getAttribute(semantic: string): Accessor | null {
		const link = this.attributes.find((link) => link.semantic === semantic);
		return link ? link.getChild() : null;
	}

	/**
	 * Sets a vertex attribute to an {@link Accessor}. All attributes must have the same vertex
	 * count.
	 */
	public setAttribute(semantic: string, accessor: Accessor | null): this {
		// Remove previous attribute.
		const prevAccessor = this.getAttribute(semantic);
		if (prevAccessor) this.removeGraphChild(this.attributes, prevAccessor);

		// Stop if deleting the attribute.
		if (!accessor) return this;

		// Add next attribute.
		const link = this.graph.linkAttribute(semantic, this, accessor);
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
	public getMaterial(): Material | null {
		return this.material ? this.material.getChild() : null;
	}

	/** Sets the material used to render the primitive. */
	public setMaterial(material: Material | null): this {
		this.material = this.graph.link('material', this, material);
		return this;
	}

	/**********************************************************************************************
	 * Mode.
	 */

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

	/**********************************************************************************************
	 * Morph targets.
	 */

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
