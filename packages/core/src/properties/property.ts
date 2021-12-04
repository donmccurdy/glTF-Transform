import { Nullable } from '../constants';
import { $attributes, $immutableKeys, Graph, GraphNode, Link } from 'property-graph';
import { isPlainObject } from '../utils';

export type PropertyResolver<T extends Property> = (p: T) => T;
export const COPY_IDENTITY = <T extends Property>(t: T): T => t;

type Ref = Link<Property, Property>;
type RefMap = { [key: string]: Ref };
type UnknownRef = Ref | Ref[] | RefMap | unknown;

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
export abstract class Property<T extends IProperty = IProperty> extends GraphNode<T> {
	/** Property type. */
	public abstract readonly propertyType: string;

	/**
	 * Internal graph used to search and maintain references.
	 * @override
	 */
	protected declare readonly graph: Graph<Property>;

	/** @hidden */
	constructor(graph: Graph<Property>, name = '') {
		super(graph);
		(this as Property).set('name', name);
	}

	protected getDefaults(): Nullable<T> {
		return Object.assign(super.getDefaults(), { name: '', extras: {} });
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
		// NOTICE: Keep in sync with `./extension-property.ts`.

		const PropertyClass = this.constructor as new (g: Graph<Property>) => this;
		const child = new PropertyClass(this.graph).copy(this, COPY_IDENTITY);

		// Root needs this event to link cloned properties.
		this.graph.emit('clone', child);

		return child;
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
			if (value instanceof Link) {
				if (!this[$immutableKeys].has(key)) {
					value.dispose();
				}
			} else if (Array.isArray(value) && value[0] instanceof Link) {
				for (const link of value as Ref[]) {
					link.dispose();
				}
			} else if (isPlainObject(value) && Object.values(value)[0] instanceof Link) {
				for (const subkey in value) {
					const link = value[subkey] as Ref;
					link.dispose();
				}
			}
		}

		// Add new references.
		for (const key in other[$attributes]) {
			const thisValue = this[$attributes][key];
			const otherValue = other[$attributes][key];
			if (otherValue instanceof Link) {
				if (this[$immutableKeys].has(key)) {
					const link = thisValue as unknown as Ref;
					link.getChild().copy(resolve(otherValue.getChild()), resolve);
				} else {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					this.setRef(key as any, resolve(otherValue.getChild()), otherValue.getAttributes());
				}
			} else if (Array.isArray(otherValue) && otherValue[0] instanceof Link) {
				for (const link of otherValue as Ref[]) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					this.addRef(key as any, resolve(link.getChild()), link.getAttributes());
				}
			} else if (isPlainObject(otherValue) && Object.values(otherValue)[0] instanceof Link) {
				for (const subkey in otherValue) {
					const link = otherValue[subkey] as Ref;
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					this.setRefMap(key as any, link.getName(), resolve(link.getChild()), link.getAttributes());
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
	 * of the properties. For example, two {@link Primitive Primitives} are equivalent if they
	 * have accessors and materials with equivalent content — but not necessarily the same specific
	 * accessors and materials.
	 */
	public equals(other: this): boolean {
		if (this === other) return true;
		if (this.propertyType !== other.propertyType) return false;

		for (const key in this[$attributes]) {
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
				// Skip object literal, or empty RefMap. Both can be skipped – we don't compare extras.
			} else if (Array.isArray(a) || Array.isArray(b) || ArrayBuffer.isView(a) || ArrayBuffer.isView(b)) {
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
		return this.listGraphParents() as Property[];
	}
}

function isRef(value: Ref | unknown): boolean {
	return value instanceof Link;
}

function isRefList(value: Ref[] | unknown): boolean {
	return Array.isArray(value) && value[0] instanceof Link;
}

function isRefMap(value: RefMap | unknown): boolean {
	return !!(value && typeof value === 'object' && Object.values(value)[0] instanceof Link);
}

function equalsRef(refA: Ref, refB: Ref): boolean {
	if (!!refA !== !!refB) return false;

	const a = refA.getChild();
	const b = refB.getChild();

	return a === b || a.equals(b);
}

function equalsRefList(refListA: Ref[], refListB: Ref[]): boolean {
	if (!!refListA !== !!refListB) return false;
	if (refListA.length !== refListB.length) return false;

	for (let i = 0; i < refListA.length; i++) {
		const a = refListA[i];
		const b = refListB[i];

		if (a.getChild() === b.getChild()) continue;

		if (!a.getChild().equals(b.getChild())) return false;
	}

	return true;
}

function equalsRefMap(refMapA: RefMap, refMapB: RefMap): boolean {
	if (!!refMapA !== !!refMapB) return false;

	const keysA = Object.keys(refMapA);
	const keysB = Object.keys(refMapB);
	if (keysA.length !== keysB.length) return false;

	for (const key in refMapA) {
		const refA = refMapA[key];
		const refB = refMapB[key];
		if (!!refA !== !!refB) return false;

		const a = refA.getChild();
		const b = refB.getChild();
		if (a === b) continue;

		if (!a.equals(b)) return false;
	}

	return true;
}

function equalsArray(a: ArrayLike<unknown> | null, b: ArrayLike<unknown> | null): boolean {
	if (a === b) return true;

	if (!!a !== !!b || !a || !b) return false;

	if (a.length !== b.length) return false;

	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}

	return true;
}
