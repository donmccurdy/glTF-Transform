import { Nullable, PropertyType } from '../constants';
import { GLTF } from '../types/gltf';
import { Accessor } from './accessor';
import { ExtensibleProperty, IExtensibleProperty } from './extensible-property';
import { Material } from './material';
import { PrimitiveTarget } from './primitive-target';
interface IPrimitive extends IExtensibleProperty {
    mode: GLTF.MeshPrimitiveMode;
    material: Material;
    indices: Accessor;
    attributes: {
        [key: string]: Accessor;
    };
    targets: PrimitiveTarget[];
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
export declare class Primitive extends ExtensibleProperty<IPrimitive> {
    propertyType: PropertyType.PRIMITIVE;
    /**********************************************************************************************
     * Constants.
     */
    /** Type of primitives to render. All valid values correspond to WebGL enums. */
    static Mode: Record<string, GLTF.MeshPrimitiveMode>;
    /**********************************************************************************************
     * Instance.
     */
    protected init(): void;
    protected getDefaults(): Nullable<IPrimitive>;
    /**********************************************************************************************
     * Primitive data.
     */
    /** Returns an {@link Accessor} with indices of vertices to be drawn. */
    getIndices(): Accessor | null;
    /**
     * Sets an {@link Accessor} with indices of vertices to be drawn. In `TRIANGLES` draw mode,
     * each set of three indices define a triangle. The front face has a counter-clockwise (CCW)
     * winding order.
     */
    setIndices(indices: Accessor | null): this;
    /** Returns a vertex attribute as an {@link Accessor}. */
    getAttribute(semantic: string): Accessor | null;
    /**
     * Sets a vertex attribute to an {@link Accessor}. All attributes must have the same vertex
     * count.
     */
    setAttribute(semantic: string, accessor: Accessor | null): this;
    /**
     * Lists all vertex attribute {@link Accessor}s associated with the primitive, excluding any
     * attributes used for morph targets. For example, `[positionAccessor, normalAccessor,
     * uvAccessor]`. Order will be consistent with the order returned by {@link .listSemantics}().
     */
    listAttributes(): Accessor[];
    /**
     * Lists all vertex attribute semantics associated with the primitive, excluding any semantics
     * used for morph targets. For example, `['POSITION', 'NORMAL', 'TEXCOORD_0']`. Order will be
     * consistent with the order returned by {@link .listAttributes}().
     */
    listSemantics(): string[];
    /** Returns the material used to render the primitive. */
    getMaterial(): Material | null;
    /** Sets the material used to render the primitive. */
    setMaterial(material: Material | null): this;
    /**********************************************************************************************
     * Mode.
     */
    /**
     * Returns the GPU draw mode (`TRIANGLES`, `LINES`, `POINTS`...) as a WebGL enum value.
     *
     * Reference:
     * - [glTF → `primitive.mode`](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#primitivemode)
     */
    getMode(): GLTF.MeshPrimitiveMode;
    /**
     * Sets the GPU draw mode (`TRIANGLES`, `LINES`, `POINTS`...) as a WebGL enum value.
     *
     * Reference:
     * - [glTF → `primitive.mode`](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#primitivemode)
     */
    setMode(mode: GLTF.MeshPrimitiveMode): this;
    /**********************************************************************************************
     * Morph targets.
     */
    /** Lists all morph targets associated with the primitive. */
    listTargets(): PrimitiveTarget[];
    /**
     * Adds a morph target to the primitive. All primitives in the same mesh must have the same
     * number of targets.
     */
    addTarget(target: PrimitiveTarget): this;
    /**
     * Removes a morph target from the primitive. All primitives in the same mesh must have the same
     * number of targets.
     */
    removeTarget(target: PrimitiveTarget): this;
}
export {};
