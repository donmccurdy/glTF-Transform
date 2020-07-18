import { ExtensionConstructor } from '../extension';
import { GraphChildList, Link } from '../graph';
import { ExtensionProperty, ExtensionPropertyConstructor } from './extension-property';
import { COPY_IDENTITY, Property } from './property';

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
export abstract class ExtensibleProperty extends Property {
	@GraphChildList protected extensions: Link<Property, ExtensionProperty>[] = [];

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this.clearGraphChildList(this.extensions);
		other.extensions.forEach((link) => {
			const extension = link.getChild();
			this.setExtension(extension.constructor as ExtensionPropertyConstructor<typeof extension>, resolve(extension));
		})

		return this;
	}

	/**
	 * Returns the {@link ExtensionProperty} of the given type attached to this Property, if any.
	 * The ExtensionProperty constructor is used as the lookup token, allowing better type-checking
	 * in TypeScript environments. *Not available on {@link Root} properties.*
	 */
	public getExtension<Prop extends ExtensionProperty>(ctor: ExtensionPropertyConstructor<Prop>): Prop {
		const name = ctor.EXTENSION_NAME;
		const link = this.extensions.find((link) => link.getChild().extensionName === name);
		return link ? link.getChild() as Prop : null;
	}

	/**
	 * Attaches the given {@link ExtensionProperty} to this Property. For a given extension, only
	 * one ExtensionProperty may be attached to any one Property at a time. *Not available on
	 * {@link Root} properties.*
	 */
	public setExtension<Prop extends ExtensionProperty>(ctor: ExtensionPropertyConstructor<Prop>, extensionProperty: Prop): this {
		// Remove previous extension.
		const prevExtension = this.getExtension(ctor);
		if (prevExtension) this.removeGraphChild(this.extensions, prevExtension);

		// Stop if deleting the extension.
		if (!extensionProperty) return this;

		// Add next extension.
		extensionProperty._validateParent(this);
		const name = extensionProperty.extensionName;
		return this.addGraphChild(this.extensions, this.graph.link(name, this, extensionProperty));
	}

	/**
	 * Lists all {@link ExtensionProperty} instances attached to this Property. *Not available on
	 * {@link Root} properties.*
	 */
	public listExtensions(): ExtensionProperty[] {
		return this.extensions.map((link) => link.getChild());
	}
}
