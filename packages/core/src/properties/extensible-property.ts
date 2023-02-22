import type { Nullable } from '../constants.js';
import type { ExtensionProperty } from './extension-property.js';
import { Property, IProperty } from './property.js';

export interface IExtensibleProperty extends IProperty {
	extensions: { [key: string]: ExtensionProperty };
}

/**
 * # ExtensibleProperty
 *
 * *A {@link Property} that can have {@link ExtensionProperty} instances attached.*
 *
 * Most properties are extensible. See the {@link Extension} documentation for information about
 * how to use extensions.
 *
 * @category Properties
 */
export abstract class ExtensibleProperty<T extends IExtensibleProperty = IExtensibleProperty> extends Property<T> {
	protected getDefaults(): Nullable<T> {
		return Object.assign(super.getDefaults(), { extensions: {} });
	}

	/** Returns an {@link ExtensionProperty} attached to this Property, if any. */
	public getExtension<Prop extends ExtensionProperty>(name: string): Prop | null {
		return (this as ExtensibleProperty).getRefMap('extensions', name) as Prop;
	}

	/**
	 * Attaches the given {@link ExtensionProperty} to this Property. For a given extension, only
	 * one ExtensionProperty may be attached to any one Property at a time.
	 */
	public setExtension<Prop extends ExtensionProperty>(name: string, extensionProperty: Prop | null): this {
		if (extensionProperty) extensionProperty._validateParent(this as ExtensibleProperty);
		return (this as ExtensibleProperty).setRefMap('extensions', name, extensionProperty) as this;
	}

	/** Lists all {@link ExtensionProperty} instances attached to this Property. */
	public listExtensions(): ExtensionProperty[] {
		return (this as ExtensibleProperty).listRefMapValues('extensions');
	}
}
