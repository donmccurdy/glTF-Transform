import { Property } from './property';
import { PropertyGraph } from './property-graph';

export interface ExtensionPropertyParent {
	addExtensionProperty(ext: ExtensionProperty): this;
	removeExtensionProperty(ext: ExtensionProperty): this;
}

/**
 * Type alias allowing ExtensionProperty constructors to be used as tokens when calling
 * property.getExtension(...) or property.setExtension(...), enabling type checking.
 */
export type ExtensionPropertyConstructor<Prop> = {new(graph: PropertyGraph, extension: ExtensionPropertyParent): Prop; EXTENSION_NAME: string};

export abstract class ExtensionProperty extends Property {
	public abstract readonly extensionName: string;
	public static EXTENSION_NAME: string;

	constructor(graph: PropertyGraph, private readonly extension: ExtensionPropertyParent) {
		super(graph);
		extension.addExtensionProperty(this);
	}

	dispose(): void {
		this.extension.removeExtensionProperty(this);
		super.dispose();
	}
}
