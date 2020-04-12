export class Vector2 {
	constructor(public x: number = 0, public y: number = 0) {}
	toArray(target: number[] = [], offset = 0): number[] {
		target[0 + offset] = this.x;
		target[1 + offset] = this.y;
		return target;
	}
}

export class Vector3 {
	constructor(public x: number = 0, public y: number = 0, public z: number = 0) {}
	toArray(target: number[] = [], offset = 0): number[] {
		target[0 + offset] = this.x;
		target[1 + offset] = this.y;
		target[2 + offset] = this.z;
		return target;
	}
}

export class Vector4 {
	constructor(public x: number = 0, public y: number = 0, public z: number = 0, public w: number = 0) {}
	toArray(target: number[] = [], offset = 0): number[] {
		target[0 + offset] = this.x;
		target[1 + offset] = this.y;
		target[2 + offset] = this.z;
		target[3 + offset] = this.w;
		return target;
	}
}

export class Matrix4 {
	private elements = new Float32Array(16);
	constructor(elements: number[]) {
		this.elements.set(elements);
	}
	toArray(target: number[] = [], offset): number[] {
		for (let i = 0; i < this.elements.length; i++) {
			target[i + offset] = this.elements[i];
		}
		return target;
	}
}
