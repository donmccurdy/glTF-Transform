import { Property } from './property';
import { PropertyGraph } from './property-graph';

export interface ExtensionPropertyOwner {
	addExtensionProperty(ext: ExtensionProperty): this;
	removeExtensionProperty(ext: ExtensionProperty): this;
}

export abstract class ExtensionProperty extends Property {
	public abstract readonly extensionName: string;

	constructor(graph: PropertyGraph, private readonly extension: ExtensionPropertyOwner) {
		super(graph);
		extension.addExtensionProperty(this);
	}

	dispose(): void {
		this.extension.removeExtensionProperty(this);
		super.dispose();
	}
}
