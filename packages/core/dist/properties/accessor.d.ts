import { Nullable, PropertyType, TypedArray } from '../constants';
import { GLTF } from '../types/gltf';
import { Buffer } from './buffer';
import { ExtensibleProperty, IExtensibleProperty } from './extensible-property';
interface IAccessor extends IExtensibleProperty {
    array: TypedArray | null;
    type: GLTF.AccessorType;
    componentType: GLTF.AccessorComponentType;
    normalized: boolean;
    buffer: Buffer;
}
/**
 * # Accessor
 *
 * *Accessors store lists of numeric, vector, or matrix elements in a typed array.*
 *
 * All large data for {@link Mesh}, {@link Skin}, and {@link Animation} properties is stored in
 * {@link Accessor}s, organized into one or more {@link Buffer}s. Each accessor provides data in
 * typed arrays, with two abstractions:
 *
 * *Elements* are the logical divisions of the data into useful types: `"SCALAR"`, `"VEC2"`,
 * `"VEC3"`, `"VEC4"`, `"MAT3"`, or `"MAT4"`. The element type can be determined with the
 * {@link getType}() method, and the number of elements in the accessor determine its
 * {@link getCount}(). The number of components in an element — e.g. 9 for `"MAT3"` — are its
 * {@link getElementSize}(). See {@link Accessor.Type}.
 *
 * *Components* are the numeric values within an element — e.g. `.x` and `.y` for `"VEC2"`. Various
 * component types are available: `BYTE`, `UNSIGNED_BYTE`, `SHORT`, `UNSIGNED_SHORT`,
 * `UNSIGNED_INT`, and `FLOAT`. The component type can be determined with the
 * {@link getComponentType} method, and the number of bytes in each component determine its
 * {@link getComponentSize}. See {@link Accessor.ComponentType}.
 *
 * Usage:
 *
 * ```typescript
 * const accessor = doc.createAccessor('myData')
 * 	.setArray(new Float32Array([1,2,3,4,5,6,7,8,9,10,11,12]))
 * 	.setType(Accessor.Type.VEC3)
 * 	.setBuffer(doc.listBuffers()[0]);
 *
 * accessor.getCount();        // → 4
 * accessor.getElementSize();  // → 3
 * accessor.getByteLength();   // → 48
 * accessor.getElement(1, []); // → [4, 5, 6]
 *
 * accessor.setElement(0, [10, 20, 30]);
 * ```
 *
 * Data access through the {@link getElement} and {@link setElement} methods reads or overwrites
 * the content of the underlying typed array. These methods use element arrays intended to be
 * compatible with the [gl-matrix](https://github.com/toji/gl-matrix) library, or with the
 * `toArray`/`fromArray` methods of libraries like three.js and babylon.js.
 *
 * Each Accessor must be assigned to a {@link Buffer}, which determines where the accessor's data
 * is stored in the final file. Assigning Accessors to different Buffers allows the data to be
 * written to different `.bin` files.
 *
 * glTF-Transform does not expose many details of sparse, normalized, or interleaved accessors
 * through its API. It reads files using those techniques, presents a simplified view of the data
 * for editing, and attempts to write data back out with optimizations. For example, vertex
 * attributes will typically be interleaved by default, regardless of the input file.
 *
 * References:
 * - [glTF → Accessors](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#accessors)
 *
 * @category Properties
 */
export declare class Accessor extends ExtensibleProperty<IAccessor> {
    propertyType: PropertyType.ACCESSOR;
    /**********************************************************************************************
     * Constants.
     */
    /** Element type contained by the accessor (SCALAR, VEC2, ...). */
    static Type: Record<string, GLTF.AccessorType>;
    /** Data type of the values composing each element in the accessor. */
    static ComponentType: Record<string, GLTF.AccessorComponentType>;
    /**********************************************************************************************
     * Instance.
     */
    protected init(): void;
    protected getDefaults(): Nullable<IAccessor>;
    copy(other: this, resolve?: <T extends import("./property").Property<import("./property").IProperty>>(t: T) => T): this;
    /**********************************************************************************************
     * Static.
     */
    /** Returns size of a given element type, in components. */
    static getElementSize(type: GLTF.AccessorType): number;
    /** Returns size of a given component type, in bytes. */
    static getComponentSize(componentType: GLTF.AccessorComponentType): number;
    /**********************************************************************************************
     * Min/max bounds.
     */
    /**
     * Minimum value of each component in this attribute. Unlike in a final glTF file, values
     * returned by this method will reflect the minimum accounting for {@link .normalized}
     * state.
     */
    getMinNormalized(target: number[]): number[];
    /**
     * Minimum value of each component in this attribute. Values returned by this method do not
     * reflect normalization: use {@link .getMinNormalized} in that case.
     */
    getMin(target: number[]): number[];
    /**
     * Maximum value of each component in this attribute. Unlike in a final glTF file, values
     * returned by this method will reflect the minimum accounting for {@link .normalized}
     * state.
     */
    getMaxNormalized(target: number[]): number[];
    /**
     * Maximum value of each component in this attribute. Values returned by this method do not
     * reflect normalization: use {@link .getMinNormalized} in that case.
     */
    getMax(target: number[]): number[];
    /**********************************************************************************************
     * Layout.
     */
    /**
     * Number of elements in the accessor. An array of length 30, containing 10 `VEC3` elements,
     * will have a count of 10.
     */
    getCount(): number;
    /** Type of element stored in the accessor. `VEC2`, `VEC3`, etc. */
    getType(): GLTF.AccessorType;
    /**
     * Sets type of element stored in the accessor. `VEC2`, `VEC3`, etc. Array length must be a
     * multiple of the component size (`VEC2` = 2, `VEC3` = 3, ...) for the selected type.
     */
    setType(type: GLTF.AccessorType): Accessor;
    /**
     * Number of components in each element of the accessor. For example, the element size of a
     * `VEC2` accessor is 2. This value is determined automatically based on array length and
     * accessor type, specified with {@link setType}().
     */
    getElementSize(): number;
    /**
     * Size of each component (a value in the raw array), in bytes. For example, the
     * `componentSize` of data backed by a `float32` array is 4 bytes.
     */
    getComponentSize(): number;
    /**
     * Component type (float32, uint16, etc.). This value is determined automatically, and can only
     * be modified by replacing the underlying array.
     */
    getComponentType(): GLTF.AccessorComponentType;
    /**********************************************************************************************
     * Normalization.
     */
    /**
     * Specifies whether integer data values should be normalized (true) to [0, 1] (for unsigned
     * types) or [-1, 1] (for signed types), or converted directly (false) when they are accessed.
     * This property is defined only for accessors that contain vertex attributes or animation
     * output data.
     */
    getNormalized(): boolean;
    /**
     * Specifies whether integer data values should be normalized (true) to [0, 1] (for unsigned
     * types) or [-1, 1] (for signed types), or converted directly (false) when they are accessed.
     * This property is defined only for accessors that contain vertex attributes or animation
     * output data.
     */
    setNormalized(normalized: boolean): this;
    /**********************************************************************************************
     * Data access.
     */
    /**
     * Returns the scalar element value at the given index, accounting for normalization if
     * applicable.
     */
    getScalar(index: number): number;
    /**
     * Assigns the scalar element value at the given index, accounting for normalization if
     * applicable.
     */
    setScalar(index: number, x: number): this;
    /**
     * Returns the vector or matrix element value at the given index, accounting for normalization
     * if applicable.
     */
    getElement(index: number, target: number[]): number[];
    /**
     * Assigns the vector or matrix element value at the given index, accounting for normalization
     * if applicable.
     */
    setElement(index: number, value: number[]): this;
    /**********************************************************************************************
     * Raw data storage.
     */
    /** Returns the {@link Buffer} into which this accessor will be organized. */
    getBuffer(): Buffer | null;
    /** Assigns the {@link Buffer} into which this accessor will be organized. */
    setBuffer(buffer: Buffer | null): this;
    /** Returns the raw typed array underlying this accessor. */
    getArray(): TypedArray | null;
    /** Assigns the raw typed array underlying this accessor. */
    setArray(array: TypedArray): this;
    /** Returns the total bytelength of this accessor, exclusive of padding. */
    getByteLength(): number;
}
export {};
