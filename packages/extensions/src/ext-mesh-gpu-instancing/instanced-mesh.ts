import { Accessor, COPY_IDENTITY, ExtensionProperty, PropertyType } from '@gltf-transform/core';
import { EXT_MESH_GPU_INSTANCING, Nullable } from '../constants';

interface IInstancedMesh {
	attributes: { [key: string]: Accessor };
}

/**
 * # InstancedMesh
 *
 * Defines GPU instances of a {@link Mesh} under one {@link Node}. See {@link MeshGPUInstancing}.
 */
export class InstancedMesh extends ExtensionProperty<IInstancedMesh> {
	public readonly propertyType = 'InstancedMesh';
	public readonly parentTypes = [PropertyType.NODE];
	public readonly extensionName = EXT_MESH_GPU_INSTANCING;
	public static EXTENSION_NAME = EXT_MESH_GPU_INSTANCING;

	protected getDefaultAttributes(): Nullable<IInstancedMesh> {
		return { attributes: {} };
	}

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this.listSemantics().forEach((semantic) => this.setAttribute(semantic, null));
		other.listSemantics().forEach((semantic) => {
			this.setAttribute(semantic, resolve(other.getAttribute(semantic)!));
		});

		return this;
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
		return this.setRefMap('attributes', semantic, accessor);
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
