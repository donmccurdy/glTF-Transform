import { Nullable, PropertyType } from '../constants.js';
import { ExtensibleProperty, IExtensibleProperty } from './extensible-property.js';
import type { Primitive } from './primitive.js';

interface IMesh extends IExtensibleProperty {
	weights: number[];
	primitives: Primitive[];
}

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
 * - [glTF → Geometry](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#geometry)
 *
 * @category Properties
 */
export class Mesh extends ExtensibleProperty<IMesh> {
	public declare propertyType: PropertyType.MESH;

	protected init(): void {
		this.propertyType = PropertyType.MESH;
	}

	protected getDefaults(): Nullable<IMesh> {
		return Object.assign(super.getDefaults() as IExtensibleProperty, { weights: [], primitives: [] });
	}

	/** Adds a {@link Primitive} to the mesh's draw call list. */
	public addPrimitive(primitive: Primitive): this {
		return this.addRef('primitives', primitive);
	}

	/** Removes a {@link Primitive} from the mesh's draw call list. */
	public removePrimitive(primitive: Primitive): this {
		return this.removeRef('primitives', primitive);
	}

	/** Lists {@link Primitive} draw calls of the mesh. */
	public listPrimitives(): Primitive[] {
		return this.listRefs('primitives');
	}

	/**
	 * Initial weights of each {@link PrimitiveTarget} on this mesh. Each {@link Primitive} must
	 * have the same number of targets. Most engines only support 4-8 active morph targets at a
	 * time.
	 */
	public getWeights(): number[] {
		return this.get('weights');
	}

	/**
	 * Initial weights of each {@link PrimitiveTarget} on this mesh. Each {@link Primitive} must
	 * have the same number of targets. Most engines only support 4-8 active morph targets at a
	 * time.
	 */
	public setWeights(weights: number[]): this {
		return this.set('weights', weights);
	}
}
