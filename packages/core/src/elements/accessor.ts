import { AccessorComponentType, AccessorTypeData, TypedArray } from "../constants";
import { GraphChild, Link } from "../graph/index";
import { Vector2, Vector3, Vector4 } from "../math";
import { Buffer } from "./buffer";
import { Element } from "./element";

export class Accessor extends Element {
    private array: TypedArray = null;
    private type: GLTF.AccessorType = GLTF.AccessorType.SCALAR;

    @GraphChild private buffer: Link<Accessor, Buffer> = null;

    public getBuffer(): Buffer { return this.buffer.getRight(); }
    public setBuffer(buffer: Buffer): Accessor {
        this.buffer = this.graph.link(this, buffer) as Link<Accessor, Buffer>;
        return this;
    }

    public getArray(): TypedArray { return this.array; }
    public setArray(array: TypedArray): Accessor {
        this.array = array;
        return this;
    }
    public getType(): GLTF.AccessorType { return this.type; }
    public setType(type: GLTF.AccessorType): Accessor {
        this.type = type;
        return this;
    }
    public getComponentType(): GLTF.AccessorComponentType {
        switch (this.array.constructor) {
            case Float32Array:
                return AccessorComponentType.FLOAT;
            case Uint32Array:
                return AccessorComponentType.UNSIGNED_INT;
            case Uint16Array:
                return AccessorComponentType.UNSIGNED_SHORT;
            case Uint8Array:
                return AccessorComponentType.UNSIGNED_BYTE;
            default:
                throw new Error('Unknown accessor componentType.');
        }
    }
    public getCount(): number {
        return this.array.length / this.getItemSize();
    }

    public getMin(): number[] {
        throw new Error('accessor.getMin() not implemented.');
    }

    public getMax(): number[] {
        throw new Error('accessor.getMax() not implemented.');
    }

    private getItemSize(): number {
        return AccessorTypeData[this.type].size;
    }

    public getX(index: number, x: number): Accessor {
        const itemSize = this.getItemSize();
        this.array[index * itemSize] = x;
        return this;
    }
    public getXY(index: number, target = new Vector2()): Vector2 {
        const itemSize = this.getItemSize();
        target.x = this.array[index * itemSize];
        target.y = this.array[index * itemSize + 1];
        return target;
    }
    public getXYZ(index: number, target = new Vector3()): Vector3 {
        const itemSize = this.getItemSize();
        target.x = this.array[index * itemSize];
        target.y = this.array[index * itemSize + 1];
        target.z = this.array[index * itemSize + 2];
        return target;
    }
    public getXYZW(index: number, target = new Vector4()): Vector4 {
        const itemSize = this.getItemSize();
        target.x = this.array[index * itemSize];
        target.y = this.array[index * itemSize + 1];
        target.z = this.array[index * itemSize + 2];
        target.w = this.array[index * itemSize + 3];
        return target;
    }

    public setX(index: number, x: number): Accessor {
        const itemSize = this.getItemSize();
        this.array[index * itemSize] = x;
        return this;
    }
    public setXY(index: number, v: Vector2): Accessor {
        const itemSize = this.getItemSize();
        this.array[index * itemSize] = v.x;
        this.array[index * itemSize + 1] = v.y;
        return this;
    }
    public setXYZ(index: number, v: Vector3): Accessor {
        const itemSize = this.getItemSize();
        this.array[index * itemSize] = v.x;
        this.array[index * itemSize + 1] = v.y;
        this.array[index * itemSize + 2] = v.z;
        return this;
    }
    public setXYZW(index: number, v: Vector4): Accessor {
        const itemSize = this.getItemSize();
        this.array[index * itemSize] = v.x;
        this.array[index * itemSize + 1] = v.y;
        this.array[index * itemSize + 2] = v.z;
        this.array[index * itemSize + 3] = v.w;
        return this;
    }
}
