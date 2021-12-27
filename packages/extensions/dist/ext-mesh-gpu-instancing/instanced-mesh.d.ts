import { Accessor, ExtensionProperty, IProperty, Nullable, PropertyType } from '@gltf-transform/core';
import { EXT_MESH_GPU_INSTANCING } from '../constants';
interface IInstancedMesh extends IProperty {
    attributes: {
        [key: string]: Accessor;
    };
}
export declare const INSTANCE_ATTRIBUTE = "INSTANCE_ATTRIBUTE";
/**
 * # InstancedMesh
 *
 * Defines GPU instances of a {@link Mesh} under one {@link Node}. See {@link MeshGPUInstancing}.
 */
export declare class InstancedMesh extends ExtensionProperty<IInstancedMesh> {
    static EXTENSION_NAME: string;
    extensionName: typeof EXT_MESH_GPU_INSTANCING;
    propertyType: 'InstancedMesh';
    parentTypes: [PropertyType.NODE];
    protected init(): void;
    protected getDefaults(): Nullable<IInstancedMesh>;
    /** Returns an instance attribute as an {@link Accessor}. */
    getAttribute(semantic: string): Accessor | null;
    /**
     * Sets an instance attribute to an {@link Accessor}. All attributes must have the same
     * instance count.
     */
    setAttribute(semantic: string, accessor: Accessor | null): this;
    /**
     * Lists all instance attributes {@link Accessor}s associated with the InstancedMesh. Order
     * will be consistent with the order returned by {@link .listSemantics}().
     */
    listAttributes(): Accessor[];
    /**
     * Lists all instance attribute semantics associated with the primitive. Order will be
     * consistent with the order returned by {@link .listAttributes}().
     */
    listSemantics(): string[];
}
export {};
