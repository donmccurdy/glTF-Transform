import { Property } from './property';
import { PropertyGraph } from './property-graph';

/** @hidden */
export interface ExtensionPropertyParent {
	addExtensionProperty(ext: ExtensionProperty): this;
	removeExtensionProperty(ext: ExtensionProperty): this;
}

/**
 * Type alias allowing ExtensionProperty constructors to be used as tokens when calling
 * property.getExtension(...) or property.setExtension(...), enabling type checking.
 * @hidden
 */
export type ExtensionPropertyConstructor<Prop> = {new(graph: PropertyGraph, extension: ExtensionPropertyParent): Prop; EXTENSION_NAME: string};

/**
 * # ExtensionProperty
 *
 * *Base class for all {@link Property} types that can be attached by an {@link Extension}.*
 *
 * After an {@link Extension} is attached to a glTF {@link Document}, the Extension may be used to
 * construct ExtensionProperty instances, to be referenced throughout the document as needed. For
 * example, the `KHR_lights_punctual` Extension defines a `Light` ExtensionProperty, which can be
 * referenced by {@link Node} Properties in the Document.
 *
 * Usage:
 *
 * ```ts
 * import { LightsPunctual, Light } from '@gltf-transform/extensions';
 *
 * const lightsExtension = doc.createExtension(LightsPunctual);
 *
 * // Attach an ExtensionProperty.
 * node.setExtension(Light, lightsExtension.createLight().setType('point'));
 *
 * // Look up an ExtensionProperty by using its constructor as a key.
 * const light = node.getExtension(Light);
 * ```
 *
 * Reference:
 * - [glTF → Extensions](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#specifying-extensions)
 */
export abstract class ExtensionProperty extends Property {
	public abstract readonly extensionName: string;
	public static EXTENSION_NAME: string;

	constructor(graph: PropertyGraph, private readonly _extension: ExtensionPropertyParent) {
		super(graph);
		this._extension.addExtensionProperty(this);
	}

	public dispose(): void {
		this._extension.removeExtensionProperty(this);
		super.dispose();
	}
}
