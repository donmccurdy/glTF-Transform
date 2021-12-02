import { Nullable } from '../constants';
import { ExtensionProperty } from './extension-property';
import { Property, IProperty } from './property';

// Breaking change introduced in v0.6.
const TOKEN_WARNING = 'Pass extension name (string) as lookup token, not a constructor.';

export interface IExtensibleProperty extends IProperty {
	extensions: { [key: string]: ExtensionProperty };
}

/**
 * # ExtensibleProperty
 *
 * *A {@link Property} that can have {@link ExtensionProperty} instances attached.*
 *
 * Most properties — excluding {@link Root} and {@link ExtensionProperty} — are extensible. See the
 * {@link Extension} documentation for information about how to use extensions.
 *
 * @category Properties
 */
export abstract class ExtensibleProperty<T extends IExtensibleProperty = IExtensibleProperty> extends Property<T> {
	protected getDefaultAttributes(): Nullable<T> {
		return Object.assign(super.getDefaultAttributes(), { extensions: {} });
	}

	/**
	 * Returns an {@link ExtensionProperty} attached to this Property, if any. *Not available on
	 * {@link Root} properties.*
	 */
	public getExtension<Prop extends ExtensionProperty>(name: string): Prop | null {
		if (typeof name !== 'string') throw new Error(TOKEN_WARNING);
		return (this as ExtensibleProperty).getRefMap('extensions', name) as Prop;
	}

	/**
	 * Attaches the given {@link ExtensionProperty} to this Property. For a given extension, only
	 * one ExtensionProperty may be attached to any one Property at a time. *Not available on
	 * {@link Root} properties.*
	 */
	public setExtension<Prop extends ExtensionProperty>(name: string, extensionProperty: Prop | null): this {
		if (extensionProperty) extensionProperty._validateParent(this as ExtensibleProperty);
		return (this as ExtensibleProperty).setRefMap('extensions', name, extensionProperty) as this;
	}

	/**
	 * Lists all {@link ExtensionProperty} instances attached to this Property. *Not available on
	 * {@link Root} properties.*
	 */
	public listExtensions(): ExtensionProperty[] {
		return (this as ExtensibleProperty).listRefMapValues('extensions');
	}
}
