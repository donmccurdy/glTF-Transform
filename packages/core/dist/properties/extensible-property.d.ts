import { Nullable } from '../constants';
import { ExtensionProperty } from './extension-property';
import { Property, IProperty } from './property';
export interface IExtensibleProperty extends IProperty {
    extensions: {
        [key: string]: ExtensionProperty;
    };
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
export declare abstract class ExtensibleProperty<T extends IExtensibleProperty = IExtensibleProperty> extends Property<T> {
    protected getDefaults(): Nullable<T>;
    /**
     * Returns an {@link ExtensionProperty} attached to this Property, if any. *Not available on
     * {@link Root} properties.*
     */
    getExtension<Prop extends ExtensionProperty>(name: string): Prop | null;
    /**
     * Attaches the given {@link ExtensionProperty} to this Property. For a given extension, only
     * one ExtensionProperty may be attached to any one Property at a time. *Not available on
     * {@link Root} properties.*
     */
    setExtension<Prop extends ExtensionProperty>(name: string, extensionProperty: Prop | null): this;
    /**
     * Lists all {@link ExtensionProperty} instances attached to this Property. *Not available on
     * {@link Root} properties.*
     */
    listExtensions(): ExtensionProperty[];
}
