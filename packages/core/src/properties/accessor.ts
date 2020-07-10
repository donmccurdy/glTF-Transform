import { PropertyType, TypedArray } from '../constants';
import { GraphChild, Link } from '../graph';
import { Buffer } from './buffer';
import { ExtensibleProperty } from './extensible-property';
import { COPY_IDENTITY } from './property';

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
 * {@link getElementSize}().
 *
 * | `type`     | Components |
 * |:----------:|:----------:|
 * | `"SCALAR"` | 1          |
 * | `"VEC2"`   | 2          |
 * | `"VEC3"`   | 3          |
 * | `"VEC4"`   | 4          |
 * | `"MAT2"`   | 4          |
 * | `"MAT3"`   | 9          |
 * | `"MAT4"`   | 16         |
 *
 * *Components* are the numeric values within an element — e.g. `.x` and `.y` for `"VEC2"`. Various
 * component types are available: `BYTE`, `UNSIGNED_BYTE`, `SHORT`, `UNSIGNED_SHORT`,
 * `UNSIGNED_INT`, and `FLOAT`. The component type can be determined with the
 * {@link getComponentType} method, and the number of bytes in each component determine its
 * {@link getComponentSize}. Component types are identified by WebGL enum values, below.
 *
 * | `componentType`         | Bytes |
 * |:-----------------------:|:-----:|
 * | `5120` (BYTE)           | 1     |
 * | `5121` (UNSIGNED_BYTE)  | 1     |
 * | `5122` (SHORT)          | 2     |
 * | `5123` (UNSIGNED_SHORT) | 2     |
 * | `5125` (UNSIGNED_INT)   | 4     |
 * | `5126` (FLOAT)          | 4     |
 *
 * Usage:
 *
 * ```typescript
 * const accessor = doc.createAccessor('myData')
 * 	.setArray(new Float32Array([1,2,3,4,5,6,7,8,9,10,11,12]))
 * 	.setType('VEC3')
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
export class Accessor extends ExtensibleProperty {
	public readonly propertyType = PropertyType.ACCESSOR;

	/** Raw data of the accessor. */
	private _array: TypedArray = null;

	/** Type of element represented. */
	private _type: GLTF.AccessorType = GLTF.AccessorType.SCALAR;

	/** Numeric type of each component in an element. */
	private _componentType: GLTF.AccessorComponentType = null;

	/** Whether data in the raw array should be considered normalized. */
	private _normalized = false;

	/** Inbound transform to normalized representation, if applicable. */
	private _in = identity;

	/** Outbound transform from normalized representation, if applicable. */
	private _out = identity;

	/** The {@link Buffer} to which this accessor's data will be written. */
	@GraphChild private buffer: Link<Accessor, Buffer> = null;

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this._array = other._array.slice();
		this._type = other._type;
		this._componentType = other._componentType;
		this._normalized = other._normalized;
		this._in = other._in;
		this._out = other._out;

		if (other.buffer) this.setBuffer(resolve(other.buffer.getChild()));

		return this;
	}

	/**********************************************************************************************
	 * Static.
	 */

	/** Supported element types. */
	public static Type = {
		SCALAR: GLTF.AccessorType.SCALAR,
		VEC2: GLTF.AccessorType.VEC2,
		VEC3: GLTF.AccessorType.VEC3,
		VEC4: GLTF.AccessorType.VEC4,
		MAT3: GLTF.AccessorType.MAT3,
		MAT4: GLTF.AccessorType.MAT4,
	}

	/** Supported component types. */
	public static ComponentType = {
		BYTE: GLTF.AccessorComponentType.BYTE,
		UNSIGNED_BYTE: GLTF.AccessorComponentType.UNSIGNED_BYTE,
		SHORT: GLTF.AccessorComponentType.SHORT,
		UNSIGNED_SHORT: GLTF.AccessorComponentType.UNSIGNED_SHORT,
		UNSIGNED_INT: GLTF.AccessorComponentType.UNSIGNED_INT,
		FLOAT: GLTF.AccessorComponentType.FLOAT,
	}

	/** Returns size of a given element type, in components. */
	public static getElementSize(type: GLTF.AccessorType): number {
		switch (type) {
			case GLTF.AccessorType.SCALAR: return 1;
			case GLTF.AccessorType.VEC2: return 2;
			case GLTF.AccessorType.VEC3: return 3;
			case GLTF.AccessorType.VEC4: return 4;
			case GLTF.AccessorType.MAT2: return 4;
			case GLTF.AccessorType.MAT3: return 9;
			case GLTF.AccessorType.MAT4: return 16;
			default:
				throw new Error('Unexpected type: ' + type);
		}
	}

	/** Returns size of a given component type, in bytes. */
	public static getComponentSize(componentType: GLTF.AccessorComponentType): number {
		switch (componentType) {
			case GLTF.AccessorComponentType.BYTE: return 1;
			case GLTF.AccessorComponentType.UNSIGNED_BYTE: return 1;
			case GLTF.AccessorComponentType.SHORT: return 2;
			case GLTF.AccessorComponentType.UNSIGNED_SHORT: return 2;
			case GLTF.AccessorComponentType.UNSIGNED_INT: return 4;
			case GLTF.AccessorComponentType.FLOAT: return 4;
			default:
				throw new Error('Unexpected component type: ' + componentType);
		}
	}

	/**********************************************************************************************
	 * Min/max bounds.
	 */

	/**
	 * Minimum value of each component in this attribute. Unlike in a final glTF file, values
	 * returned by this method will reflect the minimum accounting for {@link .normalized}
	 * state.
	 */
	public getMinNormalized(target: number[]): number[] {
		const elementSize = this.getElementSize();

		this.getMin(target);

		for (let j = 0; j < elementSize; j++) target[j] = this._out(target[j]);

		return target;
	}

	/**
	 * Minimum value of each component in this attribute. Values returned by this method do not
	 * reflect normalization: use {@link .getMinNormalized} in that case.
	 */
	public getMin(target: number[]): number[] {
		const count = this.getCount();
		const elementSize = this.getElementSize();

		for (let j = 0; j < elementSize; j++) target[j] = Infinity;

		for (let i = 0; i < count * elementSize; i += elementSize) {
			for (let j = 0; j < elementSize; j++) {
				const value = this._array[i + j];
				if (Number.isFinite(value)) {
					target[j] = Math.min(target[j], value);
				}
			}
		}

		return target;
	}

	/**
	 * Maximum value of each component in this attribute. Unlike in a final glTF file, values
	 * returned by this method will reflect the minimum accounting for {@link .normalized}
	 * state.
	 */
	public getMaxNormalized(target: number[]): number[] {
		const elementSize = this.getElementSize();

		this.getMax(target);

		for (let j = 0; j < elementSize; j++) target[j] = this._out(target[j]);

		return target;
	}

	/**
	 * Maximum value of each component in this attribute. Values returned by this method do not
	 * reflect normalization: use {@link .getMinNormalized} in that case.
	 */
	public getMax(target: number[]): number[] {
		const count = this.getCount();
		const elementSize = this.getElementSize();

		for (let j = 0; j < elementSize; j++) target[j] = -Infinity;

		for (let i = 0; i < count * elementSize; i += elementSize) {
			for (let j = 0; j < elementSize; j++) {
				const value = this._array[i + j];
				if (Number.isFinite(value)) {
					target[j] = Math.max(target[j], value);
				}
			}
		}

		return target;
	}

	/**********************************************************************************************
	 * Layout.
	 */

	/**
	 * Number of elements in the accessor. An array of length 30, containing 10 `VEC3` elements,
	 * will have a count of 10.
	 */
	public getCount(): number {
		return this._array.length / this.getElementSize();
	}

	/** Type of element stored in the accessor. `VEC2`, `VEC3`, etc. */
	public getType(): GLTF.AccessorType { return this._type; }

	/**
	 * Sets type of element stored in the accessor. `VEC2`, `VEC3`, etc. Array length must be a
	 * multiple of the component size (`VEC2` = 2, `VEC3` = 3, ...) for the selected type.
	 */
	public setType(type: GLTF.AccessorType): Accessor {
		this._type = type;
		return this;
	}

	/**
	 * Number of components in each element of the accessor. For example, the element size of a
	 * `VEC2` accessor is 2. This value is determined automatically based on array length and
	 * accessor type, specified with {@link setType}().
	 */
	public getElementSize(): number {
		return Accessor.getElementSize(this._type);
	}

	/**
	 * Size of each component (a value in the raw array), in bytes. For example, the
	 * `componentSize` of data backed by a `float32` array is 4 bytes.
	 */
	public getComponentSize(): number {
		return this._array.BYTES_PER_ELEMENT;
	}

	/**
	 * Component type (float32, uint16, etc.). This value is determined automatically, and can only
	 * be modified by replacing the underlying array.
	 */
	public getComponentType(): GLTF.AccessorComponentType {
		return this._componentType;
	}

	/**********************************************************************************************
	 * Normalization.
	 */

	/**
	 * Specifies whether integer data values should be normalized (true) to [0, 1] (for unsigned
	 * types) or [-1, 1] (for signed types), or converted directly (false) when they are accessed.
	 * This property is defined only for accessors that contain vertex attributes or animation
	 * output data.
	 */
	public getNormalized(): boolean { return this._normalized; }

	/**
	 * Specifies whether integer data values should be normalized (true) to [0, 1] (for unsigned
	 * types) or [-1, 1] (for signed types), or converted directly (false) when they are accessed.
	 * This property is defined only for accessors that contain vertex attributes or animation
	 * output data.
	 */
	public setNormalized(normalized: boolean): this {
		this._normalized = normalized;

		if (normalized) {
			this._out = (c: number): number => intToFloat(c, this._componentType);
			this._in = (f: number): number => floatToInt(f, this._componentType);
		} else {
			this._out = identity;
			this._in = identity;
		}

		return this;
	}

	/**********************************************************************************************
	 * Data access.
	 */

	/**
	 * Returns the scalar element value at the given index, accounting for normalization if
	 * applicable.
	 */
	public getScalar(index: number): number {
		const elementSize = this.getElementSize();
		return this._out(this._array[index * elementSize]);
	}

	/**
	 * Assigns the scalar element value at the given index, accounting for normalization if
	 * applicable.
	 */
	public setScalar(index: number, x: number): this {
		this._array[index * this.getElementSize()] = this._in(x);
		return this;
	}

	/**
	 * Returns the vector or matrix element value at the given index, accounting for normalization
	 * if applicable.
	 */
	public getElement(index: number, target: number[]): number[] {
		const elementSize = this.getElementSize();
		for (let i = 0; i < elementSize; i++) {
			target[i] = this._out(this._array[index * elementSize + i]);
		}
		return target;
	}

	/**
	 * Assigns the vector or matrix element value at the given index, accounting for normalization
	 * if applicable.
	 */
	public setElement(index: number, value: number[]): this {
		const elementSize = this.getElementSize();
		for (let i = 0; i < elementSize; i++) {
			this._array[index * elementSize + i] = this._in(value[i]);
		}
		return this;
	}

	/**********************************************************************************************
	 * Raw data storage.
	 */

	/** Returns the {@link Buffer} into which this accessor will be organized. */
	public getBuffer(): Buffer { return this.buffer.getChild(); }

	/** Assigns the {@link Buffer} into which this accessor will be organized. */
	public setBuffer(buffer: Buffer): this {
		this.buffer = this.graph.link('buffer', this, buffer);
		return this;
	}

	/** Returns the raw typed array underlying this accessor. */
	public getArray(): TypedArray { return this._array; }

	/** Assigns the raw typed array underlying this accessor. */
	public setArray(array: TypedArray): this {
		this._componentType = arrayToComponentType(array);
		this._array = array;
		return this;
	}

	/** Returns the total bytelength of this accessor, exclusive of padding. */
	public getByteLength(): number {
		return this._array.byteLength;
	}
}

/**************************************************************************************************
 * Array utilities.
 */

/** @hidden */
function arrayToComponentType(array: TypedArray): GLTF.AccessorComponentType {
	switch (array.constructor) {
		case Float32Array:
			return GLTF.AccessorComponentType.FLOAT;
		case Uint32Array:
			return GLTF.AccessorComponentType.UNSIGNED_INT;
		case Uint16Array:
			return GLTF.AccessorComponentType.UNSIGNED_SHORT;
		case Uint8Array:
			return GLTF.AccessorComponentType.UNSIGNED_BYTE;
		case Int16Array:
			return GLTF.AccessorComponentType.SHORT;
		case Int8Array:
			return GLTF.AccessorComponentType.BYTE;
		default:
			throw new Error('Unknown accessor componentType.');
	}
}

/**************************************************************************************************
 * Normalization utilities.
 */

/** @hidden */
function identity(v: number): number {
	return v;
}

/** @hidden */
function intToFloat(c: number, componentType: GLTF.AccessorComponentType): number {
	switch (componentType) {
		case GLTF.AccessorComponentType.FLOAT:
			return c;
		case GLTF.AccessorComponentType.UNSIGNED_SHORT:
			return c / 65535.0;
		case GLTF.AccessorComponentType.UNSIGNED_BYTE:
			return c / 255.0;
		case GLTF.AccessorComponentType.SHORT:
			return Math.max(c / 32767.0, -1.0);
		case GLTF.AccessorComponentType.BYTE:
			return Math.max(c / 127.0, -1.0);
	}

}

/** @hidden */
function floatToInt(f: number, componentType: GLTF.AccessorComponentType): number {
	switch (componentType) {
		case GLTF.AccessorComponentType.FLOAT:
			return f;
		case GLTF.AccessorComponentType.UNSIGNED_SHORT:
			return Math.round(f * 65535.0);
		case GLTF.AccessorComponentType.UNSIGNED_BYTE:
			return Math.round(f * 255.0);
		case GLTF.AccessorComponentType.SHORT:
			return Math.round(f * 32767.0);
		case GLTF.AccessorComponentType.BYTE:
			return Math.round(f * 127.0);
	}
}
