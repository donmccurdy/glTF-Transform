import { Accessor, ExtensionProperty, IProperty, Nullable, PropertyType, RefMap } from '@gltf-transform/core';
import { EXT_MESH_GPU_INSTANCING } from '../constants.js';

interface IInstancedMesh extends IProperty {
	attributes: RefMap<Accessor>;
}

// See BufferViewUsage in `writer-context.ts`.
export const INSTANCE_ATTRIBUTE = 'INSTANCE_ATTRIBUTE';

/**
 * Defines GPU instances of a {@link Mesh} under one {@link Node}. See {@link EXTMeshGPUInstancing}.
 */
export class InstancedMesh extends ExtensionProperty<IInstancedMesh> {
	public static EXTENSION_NAME = EXT_MESH_GPU_INSTANCING;
	public declare extensionName: typeof EXT_MESH_GPU_INSTANCING;
	public declare propertyType: 'InstancedMesh';
	public declare parentTypes: [PropertyType.NODE];

	protected init(): void {
		this.extensionName = EXT_MESH_GPU_INSTANCING;
		this.propertyType = 'InstancedMesh';
		this.parentTypes = [PropertyType.NODE];
	}

	protected getDefaults(): Nullable<IInstancedMesh> {
		return Object.assign(super.getDefaults() as IProperty, { attributes: new RefMap<Accessor>() });
	}

	/** Returns an instance attribute as an {@link Accessor}. */
	public getAttribute(semantic: string): Accessor | null {
		return this.getRefMap('attributes', semantic);
	}

	/**
	 * Sets an instance attribute to an {@link Accessor}. All attributes must have the same
	 * instance count.
	 */
	public setAttribute(semantic: string, accessor: Accessor | null): this {
		return this.setRefMap('attributes', semantic, accessor, { usage: INSTANCE_ATTRIBUTE });
	}

	/**
	 * Lists all instance attributes {@link Accessor}s associated with the InstancedMesh. Order
	 * will be consistent with the order returned by {@link .listSemantics}().
	 */
	public listAttributes(): Accessor[] {
		return this.listRefMapValues('attributes');
	}

	/**
	 * Lists all instance attribute semantics associated with the primitive. Order will be
	 * consistent with the order returned by {@link .listAttributes}().
	 */
	public listSemantics(): string[] {
		return this.listRefMapKeys('attributes');
	}
}
