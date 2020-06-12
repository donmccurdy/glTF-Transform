import { Document } from './document';
import { ReaderContext } from './io/reader';
import { WriterContext } from './io/writer';
import { ExtensionProperty, ExtensionPropertyParent } from './properties/extension-property';

/**
 * Type alias allowing Extension constructors to be used as tokens for type checking.
 */
export type ExtensionConstructor = {new(doc: Document): Extension; EXTENSION_NAME: string};

export abstract class Extension implements ExtensionPropertyParent {
	public static EXTENSION_NAME: string;
	public readonly extensionName: string;

	private _required = false;
	private _properties: Set<ExtensionProperty> = new Set();

	/** @hidden */
	constructor (protected readonly _doc: Document) {
		_doc.getRoot().addExtension(this);
	}

	public dispose(): void {
		this._doc.getRoot().removeExtension(this);
		for (const property of this._properties) {
			property.dispose();
		}
	}

	public isRequired(): boolean {
		return this._required;
	}

	public setRequired(required: boolean): this {
		this._required = required;
		return this;
	}

	/**********************************************************************************************
	 * ExtensionPropertyParent implementation.
	 */

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

	/**********************************************************************************************
	 * I/O implementation.
	 */

	public abstract read(readerContext: ReaderContext): this;
	public abstract write(writerContext: WriterContext): this;
}
