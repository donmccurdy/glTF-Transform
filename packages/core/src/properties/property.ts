import type { Nullable } from '../constants.js';
import {
	$attributes,
	$immutableKeys,
	Graph,
	GraphNode,
	GraphEdge,
	isRef,
	isRefList,
	isRefMap,
	LiteralKeys,
} from 'property-graph';
import {
	equalsArray,
	equalsObject,
	equalsRef,
	equalsRefList,
	equalsRefMap,
	isArray,
	isPlainObject,
} from '../utils/index.js';
import type { Ref, RefMap, UnknownRef } from '../utils/index.js';

export type PropertyResolver<T extends Property> = (p: T) => T;
export const COPY_IDENTITY = <T extends Property>(t: T): T => t;

export interface IProperty {
	name: string;
	extras: Record<string, unknown>;
}

const EMPTY_SET = new Set<string>();

/**
 * *Properties represent distinct resources in a glTF asset, referenced by other properties.*
 *
 * For example, each material and texture is a property, with material properties holding
 * references to the textures. All properties are created with factory methods on the
 * {@link Document} in which they should be constructed. Properties are destroyed by calling
 * {@link Property.dispose}().
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
 * - [glTF → Concepts](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#concepts)
 *
 * @category Properties
 */
export abstract class Property<T extends IProperty = IProperty> extends GraphNode<T> {
	/** Property type. */
	public abstract readonly propertyType: string;

	/**
	 * Internal graph used to search and maintain references.
	 * @override
	 * @hidden
	 */
	protected declare readonly graph: Graph<Property>;

	/** @hidden */
	constructor(graph: Graph<Property>, name = '') {
		super(graph);
		(this as Property)[$attributes]['name'] = name;
		this.init();
		this.dispatchEvent({ type: 'create' });
	}

	/**
	 * Initializes instance data for a subclass. Because subclass constructors run after the
	 * constructor of the parent class, and 'create' events dispatched by the parent class
	 * assume the instance is fully initialized, it's best to do any initialization here.
	 * @hidden
	 */
	protected abstract init(): void;

	/**
	 * Returns the Graph associated with this Property. For internal use.
	 * @hidden
	 * @experimental
	 */
	public getGraph(): Graph<Property> {
		return this.graph;
	}

	/**
	 * Returns default attributes for the property. Empty lists and maps should be initialized
	 * to empty arrays and objects. Always invoke `super.getDefaults()` and extend the result.
	 */
	protected getDefaults(): Nullable<T> {
		return Object.assign(super.getDefaults(), { name: '', extras: {} });
	}

	/** @hidden */
	protected set<K extends LiteralKeys<T>>(attribute: K, value: T[K]): this {
		if (Array.isArray(value)) value = value.slice() as T[K]; // copy vector, quat, color …
		return super.set(attribute, value);
	}

	/**********************************************************************************************
	 * Name.
	 */

	/**
	 * Returns the name of this property. While names are not required to be unique, this is
	 * encouraged, and non-unique names will be overwritten in some tools. For custom data about
	 * a property, prefer to use Extras.
	 */
	public getName(): string {
		return (this as Property).get('name');
	}

	/**
	 * Sets the name of this property. While names are not required to be unique, this is
	 * encouraged, and non-unique names will be overwritten in some tools. For custom data about
	 * a property, prefer to use Extras.
	 */
	public setName(name: string): this {
		return (this as Property).set('name', name) as this;
	}

	/**********************************************************************************************
	 * Extras.
	 */

	/**
	 * Returns a reference to the Extras object, containing application-specific data for this
	 * Property. Extras should be an Object, not a primitive value, for best portability.
	 */
	public getExtras(): Record<string, unknown> {
		return (this as Property).get('extras');
	}

	/**
	 * Updates the Extras object, containing application-specific data for this Property. Extras
	 * should be an Object, not a primitive value, for best portability.
	 */
	public setExtras(extras: Record<string, unknown>): this {
		return (this as Property).set('extras', extras) as this;
	}

	/**********************************************************************************************
	 * Graph state.
	 */

	/**
	 * Makes a copy of this property, with the same resources (by reference) as the original.
	 */
	public clone(): this {
		const PropertyClass = this.constructor as new (g: Graph<Property>) => this;
		return new PropertyClass(this.graph).copy(this, COPY_IDENTITY);
	}

	/**
	 * Copies all data from another property to this one. Child properties are copied by reference,
	 * unless a 'resolve' function is given to override that.
	 * @param other Property to copy references from.
	 * @param resolve Function to resolve each Property being transferred. Default is identity.
	 */
	public copy(other: this, resolve: PropertyResolver<Property> = COPY_IDENTITY): this {
		// Remove previous references.
		for (const key in this[$attributes]) {
			const value = this[$attributes][key];
			if (value instanceof GraphEdge) {
				if (!this[$immutableKeys].has(key)) {
					value.dispose();
				}
			} else if (isRefList(value)) {
				for (const ref of value as unknown as Ref[]) {
					ref.dispose();
				}
			} else if (isRefMap(value)) {
				for (const subkey in value) {
					const ref = value[subkey] as Ref;
					ref.dispose();
				}
			}
		}

		// Add new references.
		for (const key in other[$attributes]) {
			const thisValue = this[$attributes][key];
			const otherValue = other[$attributes][key];
			if (otherValue instanceof GraphEdge) {
				if (this[$immutableKeys].has(key)) {
					const ref = thisValue as unknown as Ref;
					ref.getChild().copy(resolve(otherValue.getChild()), resolve);
				} else {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					this.setRef(key as any, resolve(otherValue.getChild()), otherValue.getAttributes());
				}
			} else if (isRefList(otherValue)) {
				for (const ref of otherValue as unknown as Ref[]) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					this.addRef(key as any, resolve(ref.getChild()), ref.getAttributes());
				}
			} else if (isRefMap(otherValue)) {
				for (const subkey in otherValue) {
					const ref = otherValue[subkey] as Ref;
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					this.setRefMap(key as any, subkey, resolve(ref.getChild()), ref.getAttributes());
				}
			} else if (isPlainObject(otherValue)) {
				this[$attributes][key] = JSON.parse(JSON.stringify(otherValue));
			} else if (
				Array.isArray(otherValue) ||
				otherValue instanceof ArrayBuffer ||
				ArrayBuffer.isView(otherValue)
			) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				this[$attributes][key] = (otherValue as unknown as Uint8Array).slice() as any;
			} else {
				this[$attributes][key] = otherValue;
			}
		}

		return this;
	}

	/**
	 * Returns true if two properties are deeply equivalent, recursively comparing the attributes
	 * of the properties. Optionally, a 'skip' set may be included, specifying attributes whose
	 * values should not be considered in the comparison.
	 *
	 * Example: Two {@link Primitive Primitives} are equivalent if they have accessors and
	 * materials with equivalent content — but not necessarily the same specific accessors
	 * and materials.
	 */
	public equals(other: this, skip = EMPTY_SET): boolean {
		if (this === other) return true;
		if (this.propertyType !== other.propertyType) return false;

		for (const key in this[$attributes]) {
			if (skip.has(key)) continue;

			const a = this[$attributes][key] as UnknownRef;
			const b = other[$attributes][key] as UnknownRef;

			if (isRef(a) || isRef(b)) {
				if (!equalsRef(a as Ref, b as Ref)) {
					return false;
				}
			} else if (isRefList(a) || isRefList(b)) {
				if (!equalsRefList(a as Ref[], b as Ref[])) {
					return false;
				}
			} else if (isRefMap(a) || isRefMap(b)) {
				if (!equalsRefMap(a as RefMap, b as RefMap)) {
					return false;
				}
			} else if (isPlainObject(a) || isPlainObject(b)) {
				if (!equalsObject(a, b)) return false;
			} else if (isArray(a) || isArray(b)) {
				if (!equalsArray(a as [], b as [])) return false;
			} else {
				// Literal.
				if (a !== b) return false;
			}
		}

		return true;
	}

	public detach(): this {
		// Detaching should keep properties in the same Document, and attached to its root.
		this.graph.disconnectParents(this, (n: Property) => n.propertyType !== 'Root');
		return this;
	}

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
	public listParents(): Property[] {
		return this.graph.listParents(this);
	}
}
