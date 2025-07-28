import type { GraphEdgeEvent, GraphEvent, GraphNodeEvent } from 'property-graph';
import type { PropertyType } from './constants.js';
import type { Document } from './document.js';
import type { ReaderContext, WriterContext } from './io/index.js';
import { ExtensionProperty } from './properties/index.js';

/**
 * *Base class for all Extensions.*
 *
 * Extensions enhance a glTF {@link Document} with additional features and schema, beyond the core
 * glTF specification. Common extensions may be imported from the `@gltf-transform/extensions`
 * package, or custom extensions may be created by extending this base class.
 *
 * An extension is added to a Document by calling {@link Document.createExtension} with the
 * extension constructor. The extension object may then be used to construct
 * {@link ExtensionProperty} instances, which are attached to properties throughout the Document
 * as prescribed by the extension itself.
 *
 * For more information on available extensions and their usage, see [Extensions](/extensions).
 *
 * Reference:
 * - [glTF → Extensions](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#specifying-extensions)
 * - [glTF Extension Registry](https://github.com/KhronosGroup/gltf/blob/main/extensions)
 *
 * @category Extensions
 */
export abstract class Extension {
	/** Official name of the extension. */
	public static EXTENSION_NAME: string;
	/** Official name of the extension. */
	public readonly extensionName: string = '';
	/**
	 * Before reading, extension should be called for these {@link Property} types. *Most
	 * extensions don't need to implement this.*
	 * @hidden
	 */
	public readonly prereadTypes: PropertyType[] = [];
	/**
	 * Before writing, extension should be called for these {@link Property} types. *Most
	 * extensions don't need to implement this.*
	 * @hidden
	 */
	public readonly prewriteTypes: PropertyType[] = [];

	/** @hidden Dependency IDs needed to read this extension, to be installed before I/O. */
	public readonly readDependencies: string[] = [];
	/** @hidden Dependency IDs needed to write this extension, to be installed before I/O. */
	public readonly writeDependencies: string[] = [];

	/** @hidden */
	protected readonly document: Document;

	/** @hidden */
	protected required = false;

	/** @hidden */
	protected properties: Set<ExtensionProperty> = new Set();

	/** @hidden */
	private _listener: (event: unknown) => void;

	/** @hidden */
	constructor(document: Document) {
		this.document = document;

		document.getRoot()._enableExtension(this);

		this._listener = (_event: unknown): void => {
			const event = _event as GraphNodeEvent | GraphEdgeEvent | GraphEvent;
			const target = event.target as ExtensionProperty | unknown;
			if (target instanceof ExtensionProperty && target.extensionName === this.extensionName) {
				if (event.type === 'node:create') this._addExtensionProperty(target);
				if (event.type === 'node:dispose') this._removeExtensionProperty(target);
			}
		};

		const graph = document.getGraph();
		graph.addEventListener('node:create', this._listener);
		graph.addEventListener('node:dispose', this._listener);
	}

	/** Disables and removes the extension from the Document. */
	public dispose(): void {
		this.document.getRoot()._disableExtension(this);
		const graph = this.document.getGraph();
		graph.removeEventListener('node:create', this._listener);
		graph.removeEventListener('node:dispose', this._listener);
		for (const property of this.properties) {
			property.dispose();
		}
	}

	/** @hidden Performs first-time setup for the extension. Must be idempotent. */
	public static register(): void {}

	/**
	 * Indicates to the client whether it is OK to load the asset when this extension is not
	 * recognized. Optional extensions are generally preferred, if there is not a good reason
	 * to require a client to completely fail when an extension isn't known.
	 */
	public isRequired(): boolean {
		return this.required;
	}

	/**
	 * Indicates to the client whether it is OK to load the asset when this extension is not
	 * recognized. Optional extensions are generally preferred, if there is not a good reason
	 * to require a client to completely fail when an extension isn't known.
	 */
	public setRequired(required: boolean): this {
		this.required = required;
		return this;
	}

	/**
	 * Lists all {@link ExtensionProperty} instances associated with, or created by, this
	 * extension. Includes only instances that are attached to the Document's graph; detached
	 * instances will be excluded.
	 */
	public listProperties(): ExtensionProperty[] {
		return Array.from(this.properties);
	}

	/**********************************************************************************************
	 * ExtensionProperty management.
	 */

	/** @internal */
	private _addExtensionProperty(property: ExtensionProperty): this {
		this.properties.add(property);
		return this;
	}

	/** @internal */
	private _removeExtensionProperty(property: ExtensionProperty): this {
		this.properties.delete(property);
		return this;
	}

	/**********************************************************************************************
	 * I/O implementation.
	 */

	/** @hidden Installs dependencies required by the extension. */
	public install(_key: string, _dependency: unknown): this {
		return this;
	}

	/**
	 * Used by the {@link PlatformIO} utilities when reading a glTF asset. This method may
	 * optionally be implemented by an extension, and should then support any property type
	 * declared by the Extension's {@link Extension.prereadTypes} list. The Extension will
	 * be given a ReaderContext instance, and is expected to update either the context or its
	 * {@link JSONDocument} with resources known to the Extension. *Most extensions don't need to
	 * implement this.*
	 * @hidden
	 */
	public preread(_readerContext: ReaderContext, _propertyType: PropertyType): this {
		return this;
	}

	/**
	 * Used by the {@link PlatformIO} utilities when writing a glTF asset. This method may
	 * optionally be implemented by an extension, and should then support any property type
	 * declared by the Extension's {@link Extension.prewriteTypes} list. The Extension will
	 * be given a WriterContext instance, and is expected to update either the context or its
	 * {@link JSONDocument} with resources known to the Extension. *Most extensions don't need to
	 * implement this.*
	 * @hidden
	 */
	public prewrite(_writerContext: WriterContext, _propertyType: PropertyType): this {
		return this;
	}

	/**
	 * Used by the {@link PlatformIO} utilities when reading a glTF asset. This method must be
	 * implemented by each extension in order to support reading files. The extension will be
	 * given a ReaderContext instance, and should update the current {@link Document} accordingly.
	 * @hidden
	 */
	public abstract read(readerContext: ReaderContext): this;

	/**
	 * Used by the {@link PlatformIO} utilities when writing a glTF asset. This method must be
	 * implemented by each extension in order to support writing files. The extension will be
	 * given a WriterContext instance, and should modify the {@link JSONDocument} output
	 * accordingly. Adding the extension name to the `extensionsUsed` and `extensionsRequired` list
	 * is done automatically, and should not be included here.
	 * @hidden
	 */
	public abstract write(writerContext: WriterContext): this;
}
