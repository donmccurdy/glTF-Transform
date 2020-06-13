import { Document } from './document';
import { ReaderContext, WriterContext } from './io';
import { ExtensionProperty, ExtensionPropertyParent } from './properties';

/**
 * Type alias allowing Extension constructors to be used as tokens for type checking.
 */
export type ExtensionConstructor = {new(doc: Document): Extension; EXTENSION_NAME: string};

/**
 * # Extension
 *
 * *Description*
 *
 * Long description...
 *
 * Usage:
 *
 * ```ts
 * ```
 *
 * Reference:
 * - [glTF → Extensions](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#specifying-extensions)
 * - [glTF Extension Registry](https://github.com/KhronosGroup/glTF/blob/master/extensions)
 *
 * @category Extensions
 */
export abstract class Extension implements ExtensionPropertyParent {
	public static EXTENSION_NAME: string;
	public readonly extensionName: string;

	private _required = false;
	private _properties: Set<ExtensionProperty> = new Set();

	/** @hidden */
	constructor (protected readonly _doc: Document) {
		_doc.getRoot()._enableExtension(this);
	}

	public dispose(): void {
		this._doc.getRoot()._disableExtension(this);
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
