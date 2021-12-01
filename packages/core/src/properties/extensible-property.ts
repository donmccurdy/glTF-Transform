import { GraphChildList, Link, GraphNodeAttributes } from '../graph';
import { ExtensionProperty } from './extension-property';
import { COPY_IDENTITY, Property } from './property';

// Breaking change introduced in v0.6.
const TOKEN_WARNING = 'Pass extension name (string) as lookup token, not a constructor.';

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
export abstract class ExtensibleProperty<T extends GraphNodeAttributes = any> extends Property<T> {
	@GraphChildList protected extensions: Link<Property, ExtensionProperty>[] = [];

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this.clearGraphChildList(this.extensions);
		other.extensions.forEach((link) => {
			const extension = link.getChild();
			this.setExtension(extension.extensionName, resolve(extension));
		});

		return this;
	}

	public equals(other: this): boolean {
		if (!super.equals(other)) return false;

		// TODO(bug): Sort and compare on propertytype first.
		const extensions = this.listExtensions();
		const otherExtensions = other.listExtensions();
		if (extensions.length !== otherExtensions.length) return false;
		for (let i = 0; i < extensions.length; i++) {
			if (!extensions[i].equals(otherExtensions[i])) return false;
		}

		return true;
	}

	/**
	 * Returns an {@link ExtensionProperty} attached to this Property, if any. *Not available on
	 * {@link Root} properties.*
	 */
	public getExtension<Prop extends ExtensionProperty>(name: string): Prop | null {
		if (typeof name !== 'string') throw new Error(TOKEN_WARNING);
		const link = this.extensions.find((link) => link.getChild().extensionName === name);
		return link ? (link.getChild() as Prop) : null;
	}

	/**
	 * Attaches the given {@link ExtensionProperty} to this Property. For a given extension, only
	 * one ExtensionProperty may be attached to any one Property at a time. *Not available on
	 * {@link Root} properties.*
	 */
	public setExtension<Prop extends ExtensionProperty>(name: string, extensionProperty: Prop | null): this {
		if (typeof name !== 'string') throw new Error(TOKEN_WARNING);

		// Remove previous extension.
		const prevExtension = this.getExtension(name);
		if (prevExtension) this.removeGraphChild(this.extensions, prevExtension);

		// Stop if deleting the extension.
		if (!extensionProperty) return this;

		// Add next extension.
		extensionProperty._validateParent(this);
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
