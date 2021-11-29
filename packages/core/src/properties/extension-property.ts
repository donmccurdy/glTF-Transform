import { GraphNodeAttributes } from '../graph';
import { ExtensibleProperty } from './extensible-property';
import { COPY_IDENTITY, Property } from './property';
import { PropertyGraph } from './property-graph';

/** @hidden */
export interface ExtensionPropertyParent {
	addExtensionProperty(ext: ExtensionProperty): this;
	removeExtensionProperty(ext: ExtensionProperty): this;
}

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
 * - [glTF → Extensions](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#specifying-extensions)
 */
export abstract class ExtensionProperty<T extends GraphNodeAttributes = any> extends Property<T> {
	public static EXTENSION_NAME: string;
	public abstract readonly extensionName: string;

	/** List of supported {@link Property} types. */
	public abstract readonly parentTypes: string[];

	/** @hidden */
	constructor(graph: PropertyGraph, private readonly _extension: ExtensionPropertyParent) {
		super(graph);
		this._extension.addExtensionProperty(this);
	}

	public clone(): this {
		// NOTICE: Keep in sync with `./property.ts`.

		const PropertyClass = this.constructor as new (g: PropertyGraph, e: ExtensionPropertyParent) => this;
		const child = new PropertyClass(this.graph, this._extension).copy(this, COPY_IDENTITY);

		// Root needs this event to link cloned properties.
		this.graph.emit('clone', child);

		return child;
	}

	public dispose(): void {
		this._extension.removeExtensionProperty(this);
		super.dispose();
	}

	/** @hidden */
	public _validateParent(parent: ExtensibleProperty): void {
		if (!this.parentTypes.includes(parent.propertyType)) {
			throw new Error(`Parent "${parent.propertyType}" invalid for child "${this.propertyType}".`);
		}
	}
}
