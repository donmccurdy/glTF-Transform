import { transformMat4 } from 'gl-matrix/vec3';
import { PropertyType, bbox, mat4, vec3 } from '../constants.js';
import type { Mesh, Node, Scene } from '../properties/index.js';

/**
 * Computes bounding box (AABB) in world space for the given {@link Node} or {@link Scene}.
 *
 * Example:
 *
 * ```ts
 * const {min, max} = getBounds(scene);
 * ```
 */
export function getBounds(node: Node | Scene): bbox {
	const resultBounds = createBounds();
	const parents = node.propertyType === PropertyType.NODE ? [node] : node.listChildren();

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

/**
 * @deprecated Renamed to {@link getBounds}.
 * @hidden
 */
export const bounds = getBounds;

/** Computes mesh bounds in local space. */
function getMeshBounds(mesh: Mesh, worldMatrix: mat4): bbox {
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
function expandBounds(point: vec3, target: bbox): void {
	for (let i = 0; i < 3; i++) {
		target.min[i] = Math.min(point[i], target.min[i]);
		target.max[i] = Math.max(point[i], target.max[i]);
	}
}

/** Creates new bounds with min=Infinity, max=-Infinity. */
function createBounds(): bbox {
	return {
		min: [Infinity, Infinity, Infinity] as vec3,
		max: [-Infinity, -Infinity, -Infinity] as vec3,
	};
}
