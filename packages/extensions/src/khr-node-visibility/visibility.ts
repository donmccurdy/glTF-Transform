import { ExtensionProperty, type IProperty, type Nullable, PropertyType } from '@gltf-transform/core';
import { KHR_NODE_VISIBILITY } from '../constants.js';

interface IVisibility extends IProperty {
	visible: boolean;
}

/**
 * Defines visibility of a {@link Node} and its descendants. See {@link KHRNodeVisibility}.
 *
 * @experimental KHR_node_visibility is not yet ratified by the Khronos Group.
 */
export class Visibility extends ExtensionProperty<IVisibility> {
	public static EXTENSION_NAME: typeof KHR_NODE_VISIBILITY = KHR_NODE_VISIBILITY;
	public declare extensionName: typeof KHR_NODE_VISIBILITY;
	public declare propertyType: 'Visibility';
	public declare parentTypes: [PropertyType.NODE];

	protected init(): void {
		this.extensionName = KHR_NODE_VISIBILITY;
		this.propertyType = 'Visibility';
		this.parentTypes = [PropertyType.NODE];
	}

	protected getDefaults(): Nullable<IVisibility> {
		return Object.assign(super.getDefaults() as IProperty, { visible: true });
	}

	/** Visibility of node and descendants. */
	public getVisible(): boolean {
		return this.get('visible');
	}

	/** Visibility of node and descendants. */
	public setVisible(visible: boolean): this {
		return this.set('visible', visible);
	}
}
