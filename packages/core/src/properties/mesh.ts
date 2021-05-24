import { PropertyType } from '../constants';
import { GraphChildList } from '../graph/index';
import { Link } from '../graph/index';
import { ExtensibleProperty } from './extensible-property';
import { Primitive } from './primitive';
import { COPY_IDENTITY } from './property';

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

	/** @internal Primitive GPU draw call list. */
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
