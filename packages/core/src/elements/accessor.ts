import { AccessorComponentType, AccessorTypeData, ArrayProxy, TypedArray } from '../constants';
import { GraphChild, Link } from '../graph';
import { Buffer } from './buffer';
import { Element } from './element';

// Vector pool.
const _vector = [];

// TODO(cleanup): Having second thoughts here. Don't like dealing with ArrayTarget everywhere,
// would rather just have number[] consistently. More factors in Material class, Animation, etc.
// But am I going to regret that when I need to implement a math-heavy transform?
//
// mesh.position.fromArray( accessor.getVector3( i, tmp ) )
// accessor.setVector3( i, mesh.position )
// accessor.setData / getData
// accessor.setArray / getArray
// accessor.setVector3 / getVector3
// accessor.setVec3 / getVec3
// accessor.set / get
// accessor.setAt / getAt
// accessor.setValue / getValue ⭐️
// accessor.setComponent / getComponent
// accessor.setItem / getItem
// accessor.setArrayTarget / getArrayTarget
// accessor.setArrayReader / getArrayReader
// accessor.setObject / getObject
//
// Also, if you're not going to have the math library in here, why bother having a separate method
// for each component type? Rely on fromArray/toArray or don't.

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

	private getItemSize(): number {
		return AccessorTypeData[this.type].size;
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
			return AccessorComponentType.FLOAT;
		case Uint32Array:
			return AccessorComponentType.UNSIGNED_INT;
		case Uint16Array:
			return AccessorComponentType.UNSIGNED_SHORT;
		case Uint8Array:
			return AccessorComponentType.UNSIGNED_BYTE;
		case Int16Array:
			return AccessorComponentType.SHORT;
		case Int8Array:
			return AccessorComponentType.BYTE;
		default:
			throw new Error('Unknown accessor componentType.');
	}
}

function identity(v: number): number {
	return v;
}

function intToFloat(c: number, componentType: GLTF.AccessorComponentType): number {
	switch (componentType) {
		case AccessorComponentType.FLOAT:
			return c;
		case AccessorComponentType.UNSIGNED_SHORT:
			return c / 65535.0;
		case AccessorComponentType.UNSIGNED_BYTE:
			return c / 255.0;
		case AccessorComponentType.SHORT:
			return Math.max(c / 32767.0, -1.0);
		case AccessorComponentType.BYTE:
			return Math.max(c / 127.0, -1.0);
	}

}

function floatToInt(f: number, componentType: GLTF.AccessorComponentType): number {
	switch (componentType) {
		case AccessorComponentType.FLOAT:
			return f;
		case AccessorComponentType.UNSIGNED_SHORT:
			return Math.round(f * 65535.0);
		case AccessorComponentType.UNSIGNED_BYTE:
			return Math.round(f * 255.0);
		case AccessorComponentType.SHORT:
			return Math.round(f * 32767.0);
		case AccessorComponentType.BYTE:
			return Math.round(f * 127.0);
	}
}
