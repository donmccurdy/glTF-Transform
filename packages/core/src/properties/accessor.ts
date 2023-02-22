import { Nullable, PropertyType, TypedArray } from '../constants.js';
import type { GLTF } from '../types/gltf.js';
import { MathUtils } from '../utils/index.js';
import type { Buffer } from './buffer.js';
import { ExtensibleProperty, IExtensibleProperty } from './extensible-property.js';
import { COPY_IDENTITY } from './property.js';

interface IAccessor extends IExtensibleProperty {
	array: TypedArray | null;
	type: GLTF.AccessorType;
	componentType: GLTF.AccessorComponentType;
	normalized: boolean;
	sparse: boolean;
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
 * - [glTF → Accessors](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#accessors)
 *
 * @category Properties
 */
export class Accessor extends ExtensibleProperty<IAccessor> {
	public declare propertyType: PropertyType.ACCESSOR;

	/**********************************************************************************************
	 * Constants.
	 */

	/** Element type contained by the accessor (SCALAR, VEC2, ...). */
	public static Type: Record<string, GLTF.AccessorType> = {
		/** Scalar, having 1 value per element. */
		SCALAR: 'SCALAR',
		/** 2-component vector, having 2 components per element. */
		VEC2: 'VEC2',
		/** 3-component vector, having 3 components per element. */
		VEC3: 'VEC3',
		/** 4-component vector, having 4 components per element. */
		VEC4: 'VEC4',
		/** 2x2 matrix, having 4 components per element. */
		MAT2: 'MAT2',
		/** 3x3 matrix, having 9 components per element. */
		MAT3: 'MAT3',
		/** 4x3 matrix, having 16 components per element. */
		MAT4: 'MAT4',
	};

	/** Data type of the values composing each element in the accessor. */
	public static ComponentType: Record<string, GLTF.AccessorComponentType> = {
		/**
		 * 1-byte signed integer, stored as
		 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Int8Array Int8Array}.
		 */
		BYTE: 5120,
		/**
		 * 1-byte unsigned integer, stored as
		 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array Uint8Array}.
		 */
		UNSIGNED_BYTE: 5121,
		/**
		 * 2-byte signed integer, stored as
		 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint16Array Uint16Array}.
		 */
		SHORT: 5122,
		/**
		 * 2-byte unsigned integer, stored as
		 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint16Array Uint16Array}.
		 */
		UNSIGNED_SHORT: 5123,
		/**
		 * 4-byte unsigned integer, stored as
		 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint32Array Uint32Array}.
		 */
		UNSIGNED_INT: 5125,
		/**
		 * 4-byte floating point number, stored as
		 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Float32Array Float32Array}.
		 */
		FLOAT: 5126,
	};

	/**********************************************************************************************
	 * Instance.
	 */

	protected init(): void {
		this.propertyType = PropertyType.ACCESSOR;
	}

	protected getDefaults(): Nullable<IAccessor> {
		return Object.assign(super.getDefaults() as IExtensibleProperty, {
			array: null,
			type: Accessor.Type.SCALAR,
			componentType: Accessor.ComponentType.FLOAT,
			normalized: false,
			sparse: false,
			buffer: null,
		});
	}

	/** @internal Inbound transform to normalized representation, if applicable. */
	private _in = MathUtils.identity;

	/** @internal Outbound transform from normalized representation, if applicable. */
	private _out = MathUtils.identity;

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);
		this._in = other._in;
		this._out = other._out;
		return this;
	}

	/**********************************************************************************************
	 * Static.
	 */

	/** Returns size of a given element type, in components. */
	public static getElementSize(type: GLTF.AccessorType): number {
		switch (type) {
			case Accessor.Type.SCALAR:
				return 1;
			case Accessor.Type.VEC2:
				return 2;
			case Accessor.Type.VEC3:
				return 3;
			case Accessor.Type.VEC4:
				return 4;
			case Accessor.Type.MAT2:
				return 4;
			case Accessor.Type.MAT3:
				return 9;
			case Accessor.Type.MAT4:
				return 16;
			default:
				throw new Error('Unexpected type: ' + type);
		}
	}

	/** Returns size of a given component type, in bytes. */
	public static getComponentSize(componentType: GLTF.AccessorComponentType): number {
		switch (componentType) {
			case Accessor.ComponentType.BYTE:
				return 1;
			case Accessor.ComponentType.UNSIGNED_BYTE:
				return 1;
			case Accessor.ComponentType.SHORT:
				return 2;
			case Accessor.ComponentType.UNSIGNED_SHORT:
				return 2;
			case Accessor.ComponentType.UNSIGNED_INT:
				return 4;
			case Accessor.ComponentType.FLOAT:
				return 4;
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
		const array = this.get('array');
		const count = this.getCount();
		const elementSize = this.getElementSize();

		for (let j = 0; j < elementSize; j++) target[j] = Infinity;

		for (let i = 0; i < count * elementSize; i += elementSize) {
			for (let j = 0; j < elementSize; j++) {
				const value = array![i + j];
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
		const array = this.get('array');
		const count = this.getCount();
		const elementSize = this.getElementSize();

		for (let j = 0; j < elementSize; j++) target[j] = -Infinity;

		for (let i = 0; i < count * elementSize; i += elementSize) {
			for (let j = 0; j < elementSize; j++) {
				const value = array![i + j];
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
		const array = this.get('array');
		return array ? array.length / this.getElementSize() : 0;
	}

	/** Type of element stored in the accessor. `VEC2`, `VEC3`, etc. */
	public getType(): GLTF.AccessorType {
		return this.get('type');
	}

	/**
	 * Sets type of element stored in the accessor. `VEC2`, `VEC3`, etc. Array length must be a
	 * multiple of the component size (`VEC2` = 2, `VEC3` = 3, ...) for the selected type.
	 */
	public setType(type: GLTF.AccessorType): Accessor {
		return this.set('type', type);
	}

	/**
	 * Number of components in each element of the accessor. For example, the element size of a
	 * `VEC2` accessor is 2. This value is determined automatically based on array length and
	 * accessor type, specified with {@link setType}().
	 */
	public getElementSize(): number {
		return Accessor.getElementSize(this.get('type'));
	}

	/**
	 * Size of each component (a value in the raw array), in bytes. For example, the
	 * `componentSize` of data backed by a `float32` array is 4 bytes.
	 */
	public getComponentSize(): number {
		return this.get('array')!.BYTES_PER_ELEMENT;
	}

	/**
	 * Component type (float32, uint16, etc.). This value is determined automatically, and can only
	 * be modified by replacing the underlying array.
	 */
	public getComponentType(): GLTF.AccessorComponentType {
		return this.get('componentType');
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
	public getNormalized(): boolean {
		return this.get('normalized');
	}

	/**
	 * Specifies whether integer data values should be normalized (true) to [0, 1] (for unsigned
	 * types) or [-1, 1] (for signed types), or converted directly (false) when they are accessed.
	 * This property is defined only for accessors that contain vertex attributes or animation
	 * output data.
	 */
	public setNormalized(normalized: boolean): this {
		this.set('normalized', normalized);

		if (normalized) {
			this._out = (c: number): number => MathUtils.decodeNormalizedInt(c, this.get('componentType'));
			this._in = (f: number): number => MathUtils.encodeNormalizedInt(f, this.get('componentType'));
		} else {
			this._out = MathUtils.identity;
			this._in = MathUtils.identity;
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
		return this._out(this.get('array')![index * elementSize]);
	}

	/**
	 * Assigns the scalar element value at the given index, accounting for normalization if
	 * applicable.
	 */
	public setScalar(index: number, x: number): this {
		this.get('array')![index * this.getElementSize()] = this._in(x);
		return this;
	}

	/**
	 * Returns the vector or matrix element value at the given index, accounting for normalization
	 * if applicable.
	 */
	public getElement(index: number, target: number[]): number[] {
		const elementSize = this.getElementSize();
		const array = this.get('array')!;
		for (let i = 0; i < elementSize; i++) {
			target[i] = this._out(array[index * elementSize + i]);
		}
		return target;
	}

	/**
	 * Assigns the vector or matrix element value at the given index, accounting for normalization
	 * if applicable.
	 */
	public setElement(index: number, value: number[]): this {
		const elementSize = this.getElementSize();
		const array = this.get('array')!;
		for (let i = 0; i < elementSize; i++) {
			array![index * elementSize + i] = this._in(value[i]);
		}
		return this;
	}

	/**********************************************************************************************
	 * Raw data storage.
	 */

	/**
	 * Specifies whether the accessor should be stored sparsely. When written to a glTF file, sparse
	 * accessors store only values that differ from base values. When loaded in glTF Transform (or most
	 * runtimes) a sparse accessor can be treated like any other accessor. Currently, glTF Transform always
	 * uses zeroes for the base values when writing files.
	 * @experimental
	 */
	public getSparse(): boolean {
		return this.get('sparse');
	}

	/**
	 * Specifies whether the accessor should be stored sparsely. When written to a glTF file, sparse
	 * accessors store only values that differ from base values. When loaded in glTF Transform (or most
	 * runtimes) a sparse accessor can be treated like any other accessor. Currently, glTF Transform always
	 * uses zeroes for the base values when writing files.
	 * @experimental
	 */
	public setSparse(sparse: boolean): this {
		return this.set('sparse', sparse);
	}

	/** Returns the {@link Buffer} into which this accessor will be organized. */
	public getBuffer(): Buffer | null {
		return this.getRef('buffer');
	}

	/** Assigns the {@link Buffer} into which this accessor will be organized. */
	public setBuffer(buffer: Buffer | null): this {
		return this.setRef('buffer', buffer);
	}

	/** Returns the raw typed array underlying this accessor. */
	public getArray(): TypedArray | null {
		return this.get('array');
	}

	/** Assigns the raw typed array underlying this accessor. */
	public setArray(array: TypedArray): this {
		this.set('componentType', array ? arrayToComponentType(array) : Accessor.ComponentType.FLOAT);
		this.set('array', array);
		return this;
	}

	/** Returns the total bytelength of this accessor, exclusive of padding. */
	public getByteLength(): number {
		const array = this.get('array');
		return array ? array.byteLength : 0;
	}
}

/**************************************************************************************************
 * Accessor utilities.
 */

/** @internal */
function arrayToComponentType(array: TypedArray): GLTF.AccessorComponentType {
	switch (array.constructor) {
		case Float32Array:
			return Accessor.ComponentType.FLOAT;
		case Uint32Array:
			return Accessor.ComponentType.UNSIGNED_INT;
		case Uint16Array:
			return Accessor.ComponentType.UNSIGNED_SHORT;
		case Uint8Array:
			return Accessor.ComponentType.UNSIGNED_BYTE;
		case Int16Array:
			return Accessor.ComponentType.SHORT;
		case Int8Array:
			return Accessor.ComponentType.BYTE;
		default:
			throw new Error('Unknown accessor componentType.');
	}
}
