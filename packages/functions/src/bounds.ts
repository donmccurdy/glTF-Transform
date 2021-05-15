import { transformMat4 } from 'gl-matrix/vec3';
import { Mesh, Node, Scene, mat4, vec3 } from '@gltf-transform/core';

/**
 * Computes bounding box (AABB) in world space for the given {@link Node} or {@link Scene}.
 *
 * Example:
 *
 * ```ts
 * const {min, max} = bounds(scene);
 * ```
 */
export function bounds (node: Node | Scene): {min: vec3; max: vec3} {
	const resultBounds = createBounds();
	const parents = node instanceof Node ? [node] : node.listChildren();

	for (const parent of parents) {
		parent.traverse((node) => {
			const mesh = node.getMesh();
			if (!mesh) return;

			// Compute mesh bounds and update result.
			const meshBounds = getMeshBounds(mesh, node.getWorldMatrix());
			expandBounds(meshBounds.min, resultBounds);
			expandBounds(meshBounds.max, resultBounds);
		});
	}

	return resultBounds;
}

/** Computes mesh bounds in local space. */
function getMeshBounds(mesh: Mesh, worldMatrix: mat4): {min: vec3; max: vec3} {
	const meshBounds = createBounds();

	// We can't transform a local AABB into world space and still have a tight AABB in world space,
	// so we need to compute the world AABB vertex by vertex here.
	for (const prim of mesh.listPrimitives()) {
		const position = prim.getAttribute('POSITION');
		if (!position) continue;

		let localPos: vec3 = [0, 0, 0];
		let worldPos: vec3 = [0, 0, 0];
		for (let i = 0; i < position.getCount(); i++) {
			localPos = position.getElement(i, localPos) as vec3;
			worldPos = transformMat4(worldPos, localPos, worldMatrix) as vec3;
			expandBounds(worldPos, meshBounds);
		}
	}

	return meshBounds;
}

/** Expands bounds of target by given source. */
function expandBounds(point: vec3, target: {min: vec3; max: vec3}): void {
	for (let i = 0; i < 3; i++) {
		target.min[i] = Math.min(point[i], target.min[i]);
		target.max[i] = Math.max(point[i], target.max[i]);
	}
}

/** Creates new bounds with min=Infinity, max=-Infinity. */
function createBounds(): {min: vec3; max: vec3} {
	return {
		min: [Infinity, Infinity, Infinity] as vec3,
		max: [-Infinity, -Infinity, -Infinity] as vec3,
	};
}
