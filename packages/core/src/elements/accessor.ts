import { ArrayProxy, TypedArray } from '../constants';
import { GraphChild, Link } from '../graph';
import { Buffer } from './buffer';
import { Element } from './element';

// Vector pool.
const _vector = [];

/**
 * @category Elements
 */
export class Accessor extends Element {
	private array: TypedArray = null;
	private type: GLTF.AccessorType = GLTF.AccessorType.SCALAR;
	private componentType: GLTF.AccessorComponentType = null;
	private normalized = false;

	private in = identity;
	private out = identity;

	@GraphChild private buffer: Link<Accessor, Buffer> = null;

	/* Static. */

	public static Type = {
		SCALAR: GLTF.AccessorType.SCALAR,
		VEC2: GLTF.AccessorType.VEC2,
		VEC3: GLTF.AccessorType.VEC3,
		VEC4: GLTF.AccessorType.VEC4,
		MAT3: GLTF.AccessorType.MAT3,
		MAT4: GLTF.AccessorType.MAT4,
	}

	public static ComponentType = {
		BYTE: GLTF.AccessorComponentType.BYTE,
		UNSIGNED_BYTE: GLTF.AccessorComponentType.UNSIGNED_BYTE,
		SHORT: GLTF.AccessorComponentType.SHORT,
		UNSIGNED_SHORT: GLTF.AccessorComponentType.UNSIGNED_SHORT,
		UNSIGNED_INT: GLTF.AccessorComponentType.UNSIGNED_INT,
		FLOAT: GLTF.AccessorComponentType.FLOAT,
	}

	public static getItemSize(type: GLTF.AccessorType): number {
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

	/* Instance. */

	public getBuffer(): Buffer { return this.buffer.getRight(); }

	public setBuffer(buffer: Buffer): Accessor {
		this.buffer = this.graph.link('buffer', this, buffer) as Link<Accessor, Buffer>;
		return this;
	}

	public getArray(): TypedArray { return this.array; }

	public setArray(array: TypedArray): Accessor {
		this.componentType = arrayToComponentType(array);
		this.array = array;
		return this;
	}

	public getType(): GLTF.AccessorType { return this.type; }

	public setType(type: GLTF.AccessorType): Accessor {
		this.type = type;
		return this;
	}

	public getComponentType(): GLTF.AccessorComponentType {
		return this.componentType;
	}

	public getCount(): number {
		return this.array.length / this.getItemSize();
	}

	/**
	 * Minimum value of each component in this attribute. Array elements must
	 * be treated as having the same data type as accessor's componentType.
	 * The {@link .normalized} property has no effect on array values: they
	 * always correspond to the actual values stored in the buffer.
	 */
	public getMin(target: number[]): Accessor {
		const count = this.getCount();
		const itemSize = this.getItemSize();

		for (let j = 0; j < itemSize; j++) target[j] = Infinity;

		for (let i = 0; i < count * itemSize; i += itemSize) {
			for (let j = 0; j < itemSize; j++) {
				target[j] = Math.min(target[j], this.array[i + j]);
			}
		}

		return this;
	}

	public getMax(target: number[]): Accessor {
		const count = this.getCount();
		const itemSize = this.getItemSize();

		for (let j = 0; j < itemSize; j++) target[j] = -Infinity;

		for (let i = 0; i < count * itemSize; i += itemSize) {
			for (let j = 0; j < itemSize; j++) {
				target[j] = Math.max(target[j], this.array[i + j]);
			}
		}

		return this;
	}

	public getItemSize(): number {
		return Accessor.getItemSize(this.type);
	}

	public getComponentSize(): number {
		return Accessor.getComponentSize(this.componentType);
	}

	public getNormalized(): boolean { return this.normalized; }

	public setNormalized(normalized: boolean): Accessor {
		this.normalized = normalized;

		if (normalized) {
			this.out = (c: number): number => intToFloat(c, this.componentType);
			this.in = (f: number): number => floatToInt(f, this.componentType);
		} else {
			this.out = identity;
			this.in = identity;
		}

		return this;
	}

	public getScalar(index: number): number {
		const itemSize = this.getItemSize();
		return this.out(this.array[index * itemSize]);
	}
	public getValue(index: number, target: number[]): number[] {
		const itemSize = this.getItemSize();
		for (let i = 0; i < itemSize; i++) {
			target[i] = this.out(this.array[index * itemSize + i]);
		}
		return target;
	}
	public getObject(index: number, target: ArrayProxy): ArrayProxy {
		return target.fromArray(this.getValue(index, _vector));
	}

	public setScalar(index: number, x: number): Accessor {
		this.array[index * this.getItemSize()] = this.in(x);
		return this;
	}
	public setValue(index: number, value: number[]): Accessor {
		const itemSize = this.getItemSize();
		for (let i = 0; i < itemSize; i++) {
			this.array[index * itemSize + i] = this.in(value[i]);
		}
		return this;
	}
	public setObject(index: number, target: ArrayProxy): Accessor {
		return this.setValue(index, target.toArray(_vector));
	}
}

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

function identity(v: number): number {
	return v;
}

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
