import { transformMat4 } from 'gl-matrix/vec3';
import { PropertyType, bbox, mat4, vec3 } from '../constants.js';
import type { Mesh, Node, Scene } from '../properties/index.js';

/** @hidden Implemented in /core for use by /extensions, publicly exported from /functions. */
export function getBounds(node: Node | Scene): bbox {
	const resultBounds = createBounds();
	const parents = node.propertyType === PropertyType.NODE ? [node] : node.listChildren();

	for (const parent of parents) {
		parent.traverse((node) => {
			const mesh = node.getMesh();
			if (!mesh) return;

			// Compute mesh bounds and update result.
			const meshBounds = getMeshBounds(mesh, node.getWorldMatrix());
			if (meshBounds.min.every(isFinite) && meshBounds.max.every(isFinite)) {
				expandBounds(meshBounds.min, resultBounds);
				expandBounds(meshBounds.max, resultBounds);
			}
		});
	}

	return resultBounds;
}

/** Computes mesh bounds in world space. */
function getMeshBounds(mesh: Mesh, worldMatrix: mat4): bbox {
	const meshBounds = createBounds();

	// We can't transform a local AABB into world space and still have a tight AABB in world space,
	// so we need to compute the world AABB vertex by vertex here.
	for (const prim of mesh.listPrimitives()) {
		const position = prim.getAttribute('POSITION');
		const indices = prim.getIndices();
		if (!position) continue;

		let localPos: vec3 = [0, 0, 0];
		let worldPos: vec3 = [0, 0, 0];
		for (let i = 0, il = indices ? indices.getCount() : position.getCount(); i < il; i++) {
			const index = indices ? indices.getScalar(i) : i;
			localPos = position.getElement(index, localPos) as vec3;
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
