/** @category Math */
export class Vector2 {
	/** Creates a new {@link Vector2}. */
	constructor(public x: number = 0, public y: number = 0) {}
	/** Writes the {@link Vector2} to an array, optionally starting at a given offset. */
	public toArray(target: number[] = [], offset = 0): number[] {
		target[0 + offset] = this.x;
		target[1 + offset] = this.y;
		return target;
	}
}

/** @category Math */
export class Vector3 {
	/** Creates a new {@link Vector3}. */
	constructor(public x: number = 0, public y: number = 0, public z: number = 0) {}
	/** Writes the {@link Vector3} to an array, optionally starting at a given offset. */
	public toArray(target: number[] = [], offset = 0): number[] {
		target[0 + offset] = this.x;
		target[1 + offset] = this.y;
		target[2 + offset] = this.z;
		return target;
	}
}

/** @category Math */
export class Vector4 {
	/** Creates a new {@link Vector4}. */
	constructor(public x: number = 0, public y: number = 0, public z: number = 0, public w: number = 0) {}
	/** Writes the {@link Vector4} to an array, optionally starting at a given offset. */
	public toArray(target: number[] = [], offset = 0): number[] {
		target[0 + offset] = this.x;
		target[1 + offset] = this.y;
		target[2 + offset] = this.z;
		target[3 + offset] = this.w;
		return target;
	}
}

/** @category Math */
export class Matrix4 {
	/** Creates a new {@link Matrix4}. */
	private elements = new Float32Array(16);
	constructor(elements: number[]) {
		this.elements.set(elements);
	}
	/** Writes the {@link Matrix4} to an array, optionally starting at a given offset. */
	public toArray(target: number[] = [], offset): number[] {
		for (let i = 0; i < this.elements.length; i++) {
			target[i + offset] = this.elements[i];
		}
		return target;
	}
}
