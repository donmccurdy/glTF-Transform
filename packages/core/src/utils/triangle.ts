import { vec3 } from 'gl-matrix';

/**
 * A geometric triangle as defined by three vectors representing its three corners.
 */
class Triangle {
	a: vec3;
	b: vec3;
	c: vec3;
	/**
	 * Constructs a new triangle.
	 *
	 * @param {vec3} [a=(0,0,0)] - The first corner of the triangle.
	 * @param {vec3} [b=(0,0,0)] - The second corner of the triangle.
	 * @param {vec3} [c=(0,0,0)] - The third corner of the triangle.
	 */
	constructor(a: vec3 = [0, 0, 0], b: vec3 = [0, 0, 0], c: vec3 = [0, 0, 0]) {
		/**
		 * The first corner of the triangle.
		 *
		 * @type {vec3}
		 */
		this.a = a;

		/**
		 * The second corner of the triangle.
		 *
		 * @type {vec3}
		 */
		this.b = b;

		/**
		 * The third corner of the triangle.
		 *
		 * @type {vec3}
		 */
		this.c = c;
	}

	/**
	 * Computes the normal vector of a triangle.
	 *
	 * @param {vec3} a - The first corner of the triangle.
	 * @param {vec3} b - The second corner of the triangle.
	 * @param {vec3} c - The third corner of the triangle.
	 * @param {vec3} target - The target vector that is used to store the method's result.
	 * @return {vec3} The triangle's normal.
	 */
	static getNormal(a: vec3, b: vec3, c: vec3, target: vec3) {
		vec3.subtract(target, c, b);
		const _v0 = vec3.create();
		vec3.subtract(_v0, a, b);
		vec3.cross(target, target, _v0);

		const targetLengthSq = vec3.squaredLength(target);
		if (targetLengthSq > 0) {
			return vec3.scale(target, target, 1 / Math.sqrt(targetLengthSq));
		}

		return (target = [0, 0, 0]);
	}
}

export { Triangle };
