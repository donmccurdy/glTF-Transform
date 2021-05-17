import { Accessor, AttributeLink, COPY_IDENTITY, ExtensionProperty, GraphChildList, PropertyType } from '@gltf-transform/core';
import { EXT_MESH_GPU_INSTANCING } from '../constants';

/**
 * # InstancedMesh
 *
 * Defines GPU instances of a {@link Mesh} under one {@link Node}. See {@link MeshGPUInstancing}.
 */
export class InstancedMesh extends ExtensionProperty {
	public readonly propertyType = 'InstancedMesh';
	public readonly parentTypes = [PropertyType.NODE];
	public readonly extensionName = EXT_MESH_GPU_INSTANCING;
	public static EXTENSION_NAME = EXT_MESH_GPU_INSTANCING;

	@GraphChildList private attributes: AttributeLink[] = [];

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this.clearGraphChildList(this.attributes);
		other.listSemantics().forEach((semantic) => {
			this.setAttribute(semantic, resolve(other.getAttribute(semantic)!));
		});

		return this;
	}

	/** Returns an instance attribute as an {@link Accessor}. */
	public getAttribute(semantic: string): Accessor | null {
		const link = this.attributes.find((link) => link.semantic === semantic);
		return link ? link.getChild() : null;
	}

	/**
	 * Sets an instance attribute to an {@link Accessor}. All attributes must have the same
	 * instance count.
	 */
	public setAttribute(semantic: string, accessor: Accessor | null): this {
		// Remove previous attribute.
		const prevAccessor = this.getAttribute(semantic);
		if (prevAccessor) this.removeGraphChild(this.attributes, prevAccessor);

		// Stop if deleting the attribute.
		if (!accessor) return this;

		// Add next attribute.
		const link = this.graph.linkAttribute(
			semantic.toLowerCase(), this, accessor
		) as AttributeLink;
		link.semantic = semantic;
		return this.addGraphChild(this.attributes, link);
	}

	/**
	 * Lists all instance attributes {@link Accessor}s associated with the InstancedMesh. Order
	 * will be consistent with the order returned by {@link .listSemantics}().
	 */
	public listAttributes(): Accessor[] {
		return this.attributes.map((link) => link.getChild());
	}

	/**
	 * Lists all instance attribute semantics associated with the primitive. Order will be
	 * consistent with the order returned by {@link .listAttributes}().
	 */
	public listSemantics(): string[] {
		return this.attributes.map((link) => link.semantic);
	}
}
