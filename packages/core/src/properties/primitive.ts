import { BufferViewUsage, Nullable, PropertyType } from '../constants.js';
import type { GLTF } from '../types/gltf.js';
import type { Accessor } from './accessor.js';
import { ExtensibleProperty, IExtensibleProperty } from './extensible-property.js';
import type { Material } from './material.js';
import type { PrimitiveTarget } from './primitive-target.js';

interface IPrimitive extends IExtensibleProperty {
	mode: GLTF.MeshPrimitiveMode;
	material: Material;
	indices: Accessor;
	attributes: { [key: string]: Accessor };
	targets: PrimitiveTarget[];
}

/**
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
 * - [glTF → Geometry](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#geometry)
 *
 * @category Properties
 */
export class Primitive extends ExtensibleProperty<IPrimitive> {
	public declare propertyType: PropertyType.PRIMITIVE;

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
	};

	/**********************************************************************************************
	 * Instance.
	 */

	protected init(): void {
		this.propertyType = PropertyType.PRIMITIVE;
	}

	protected getDefaults(): Nullable<IPrimitive> {
		return Object.assign(super.getDefaults() as IExtensibleProperty, {
			mode: Primitive.Mode.TRIANGLES,
			material: null,
			indices: null,
			attributes: {},
			targets: [],
		});
	}

	/**********************************************************************************************
	 * Primitive data.
	 */

	/** Returns an {@link Accessor} with indices of vertices to be drawn. */
	public getIndices(): Accessor | null {
		return this.getRef('indices');
	}

	/**
	 * Sets an {@link Accessor} with indices of vertices to be drawn. In `TRIANGLES` draw mode,
	 * each set of three indices define a triangle. The front face has a counter-clockwise (CCW)
	 * winding order.
	 */
	public setIndices(indices: Accessor | null): this {
		return this.setRef('indices', indices, { usage: BufferViewUsage.ELEMENT_ARRAY_BUFFER });
	}

	/** Returns a vertex attribute as an {@link Accessor}. */
	public getAttribute(semantic: string): Accessor | null {
		return this.getRefMap('attributes', semantic);
	}

	/**
	 * Sets a vertex attribute to an {@link Accessor}. All attributes must have the same vertex
	 * count.
	 */
	public setAttribute(semantic: string, accessor: Accessor | null): this {
		return this.setRefMap('attributes', semantic, accessor, { usage: BufferViewUsage.ARRAY_BUFFER });
	}

	/**
	 * Lists all vertex attribute {@link Accessor}s associated with the primitive, excluding any
	 * attributes used for morph targets. For example, `[positionAccessor, normalAccessor,
	 * uvAccessor]`. Order will be consistent with the order returned by {@link .listSemantics}().
	 */
	public listAttributes(): Accessor[] {
		return this.listRefMapValues('attributes');
	}

	/**
	 * Lists all vertex attribute semantics associated with the primitive, excluding any semantics
	 * used for morph targets. For example, `['POSITION', 'NORMAL', 'TEXCOORD_0']`. Order will be
	 * consistent with the order returned by {@link .listAttributes}().
	 */
	public listSemantics(): string[] {
		return this.listRefMapKeys('attributes');
	}

	/** Returns the material used to render the primitive. */
	public getMaterial(): Material | null {
		return this.getRef('material');
	}

	/** Sets the material used to render the primitive. */
	public setMaterial(material: Material | null): this {
		return this.setRef('material', material);
	}

	/**********************************************************************************************
	 * Mode.
	 */

	/**
	 * Returns the GPU draw mode (`TRIANGLES`, `LINES`, `POINTS`...) as a WebGL enum value.
	 *
	 * Reference:
	 * - [glTF → `primitive.mode`](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#primitivemode)
	 */
	public getMode(): GLTF.MeshPrimitiveMode {
		return this.get('mode');
	}

	/**
	 * Sets the GPU draw mode (`TRIANGLES`, `LINES`, `POINTS`...) as a WebGL enum value.
	 *
	 * Reference:
	 * - [glTF → `primitive.mode`](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#primitivemode)
	 */
	public setMode(mode: GLTF.MeshPrimitiveMode): this {
		return this.set('mode', mode);
	}

	/**********************************************************************************************
	 * Morph targets.
	 */

	/** Lists all morph targets associated with the primitive. */
	public listTargets(): PrimitiveTarget[] {
		return this.listRefs('targets');
	}

	/**
	 * Adds a morph target to the primitive. All primitives in the same mesh must have the same
	 * number of targets.
	 */
	public addTarget(target: PrimitiveTarget): this {
		return this.addRef('targets', target);
	}

	/**
	 * Removes a morph target from the primitive. All primitives in the same mesh must have the same
	 * number of targets.
	 */
	public removeTarget(target: PrimitiveTarget): this {
		return this.removeRef('targets', target);
	}
}
