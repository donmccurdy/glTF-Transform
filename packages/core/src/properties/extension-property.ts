import type { ExtensibleProperty } from './extensible-property.js';
import { Property, IProperty } from './property.js';

/**
 * # ExtensionProperty
 *
 * *Base class for all {@link Property} types that can be attached by an {@link Extension}.*
 *
 * After an {@link Extension} is attached to a glTF {@link Document}, the Extension may be used to
 * construct ExtensionProperty instances, to be referenced throughout the document as prescribed by
 * the Extension. For example, the `KHR_materials_clearcoat` Extension defines a `Clearcoat`
 * ExtensionProperty, which is referenced by {@link Material} Properties in the Document, and may
 * contain references to {@link Texture} properties of its own.
 *
 * For more information on available extensions and their usage, see [Extensions](/extensions).
 *
 * Reference:
 * - [glTF → Extensions](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#specifying-extensions)
 */
export abstract class ExtensionProperty<T extends IProperty = IProperty> extends Property<T> {
	public static EXTENSION_NAME: string;
	public abstract readonly extensionName: string;

	/** List of supported {@link Property} types. */
	public abstract readonly parentTypes: string[];

	/** @hidden */
	public _validateParent(parent: ExtensibleProperty): void {
		if (!this.parentTypes.includes(parent.propertyType)) {
			throw new Error(`Parent "${parent.propertyType}" invalid for child "${this.propertyType}".`);
		}
	}
}
