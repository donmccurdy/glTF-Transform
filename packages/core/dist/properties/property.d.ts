import { Nullable } from '../constants';
import { Graph, GraphNode } from 'property-graph';
export declare type PropertyResolver<T extends Property> = (p: T) => T;
export declare const COPY_IDENTITY: <T extends Property<IProperty>>(t: T) => T;
export interface IProperty {
    name: string;
    extras: Record<string, unknown>;
}
/**
 * # Property
 *
 * *Properties represent distinct resources in a glTF asset, referenced by other properties.*
 *
 * For example, each material and texture is a property, with material properties holding
 * references to the textures. All properties are created with factory methods on the
 * {@link Document} in which they should be constructed. Properties are destroyed by calling
 * {@link dispose}().
 *
 * Usage:
 *
 * ```ts
 * const texture = doc.createTexture('myTexture');
 * doc.listTextures(); // → [texture x 1]
 *
 * // Attach a texture to a material.
 * material.setBaseColorTexture(texture);
 * material.getBaseColortexture(); // → texture
 *
 * // Detaching a texture removes any references to it, except from the doc.
 * texture.detach();
 * material.getBaseColorTexture(); // → null
 * doc.listTextures(); // → [texture x 1]
 *
 * // Disposing a texture removes all references to it, and its own references.
 * texture.dispose();
 * doc.listTextures(); // → []
 * ```
 *
 * Reference:
 * - [glTF → Concepts](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#concepts)
 *
 * @category Properties
 */
export declare abstract class Property<T extends IProperty = IProperty> extends GraphNode<T> {
    /** Property type. */
    abstract readonly propertyType: string;
    /**
     * Internal graph used to search and maintain references.
     * @override
     * @hidden
     */
    protected readonly graph: Graph<Property>;
    /** @hidden */
    constructor(graph: Graph<Property>, name?: string);
    /**
     * Initializes instance data for a subclass. Because subclass constructors run after the
     * constructor of the parent class, and 'create' events dispatched by the parent class
     * assume the instance is fully initialized, it's best to do any initialization here.
     * @hidden
     */
    protected abstract init(): void;
    /**
     * Returns default attributes for the property. Empty lists and maps should be initialized
     * to empty arrays and objects. Always invoke `super.getDefaults()` and extend the result.
     */
    protected getDefaults(): Nullable<T>;
    /**********************************************************************************************
     * Name.
     */
    /**
     * Returns the name of this property. While names are not required to be unique, this is
     * encouraged, and non-unique names will be overwritten in some tools. For custom data about
     * a property, prefer to use Extras.
     */
    getName(): string;
    /**
     * Sets the name of this property. While names are not required to be unique, this is
     * encouraged, and non-unique names will be overwritten in some tools. For custom data about
     * a property, prefer to use Extras.
     */
    setName(name: string): this;
    /**********************************************************************************************
     * Extras.
     */
    /**
     * Returns a reference to the Extras object, containing application-specific data for this
     * Property. Extras should be an Object, not a primitive value, for best portability.
     */
    getExtras(): Record<string, unknown>;
    /**
     * Updates the Extras object, containing application-specific data for this Property. Extras
     * should be an Object, not a primitive value, for best portability.
     */
    setExtras(extras: Record<string, unknown>): this;
    /**********************************************************************************************
     * Graph state.
     */
    /**
     * Makes a copy of this property, with the same resources (by reference) as the original.
     */
    clone(): this;
    /**
     * Copies all data from another property to this one. Child properties are copied by reference,
     * unless a 'resolve' function is given to override that.
     * @param other Property to copy references from.
     * @param resolve Function to resolve each Property being transferred. Default is identity.
     */
    copy(other: this, resolve?: PropertyResolver<Property>): this;
    /**
     * Returns true if two properties are deeply equivalent, recursively comparing the attributes
     * of the properties. For example, two {@link Primitive Primitives} are equivalent if they
     * have accessors and materials with equivalent content — but not necessarily the same specific
     * accessors and materials.
     */
    equals(other: this): boolean;
    detach(): this;
    /**
     * Returns a list of all properties that hold a reference to this property. For example, a
     * material may hold references to various textures, but a texture does not hold references
     * to the materials that use it.
     *
     * It is often necessary to filter the results for a particular type: some resources, like
     * {@link Accessor}s, may be referenced by different types of properties. Most properties
     * include the {@link Root} as a parent, which is usually not of interest.
     *
     * Usage:
     *
     * ```ts
     * const materials = texture
     * 	.listParents()
     * 	.filter((p) => p instanceof Material)
     * ```
     */
    listParents(): Property[];
}
