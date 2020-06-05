import { Document } from './document';
import { ReaderContext } from './io/reader';
import { WriterContext } from './io/writer';
import { ExtensionProperty, ExtensionPropertyOwner } from './properties/extension-property';

export abstract class Extension implements ExtensionPropertyOwner {
	public static EXTENSION_NAME: string;
	public readonly extensionName: string;

	private _required = false;
	private _properties: Set<ExtensionProperty> = new Set();

	constructor (protected readonly _doc: Document) {
		_doc.getRoot().addExtension(this);
	}

	public dispose(): void {
		this._doc.getRoot().removeExtension(this);
		for (const property of this._properties) {
			property.dispose();
		}
	}

	/** @hidden */
	addExtensionProperty(property: ExtensionProperty): this {
		this._properties.add(property);
		return this;
	}

	/** @hidden */
	removeExtensionProperty(property: ExtensionProperty): this {
		this._properties.delete(property);
		return this;
	}

	public isRequired(): boolean {
		return this._required;
	}

	public setRequired(required: boolean): this {
		this._required = required;
		return this;
	}

	public abstract read(readerContext: ReaderContext): this;
	public abstract write(writerContext: WriterContext): this;
}
