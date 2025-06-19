import type { Accessor, Mesh, Node, Primitive, Scene } from '@gltf-transform/core';
import type { InstancedMesh } from '@gltf-transform/extensions';

/**
 * Various methods of estimating a vertex count. For some background on why
 * multiple definitions of a vertex count should exist, see [_Vertex Count
 * Higher in Engine than in 3D Software_](https://shahriyarshahrabi.medium.com/vertex-count-higher-in-engine-than-in-3d-software-badc348ada66).
 * Totals for a {@link Scene}, {@link Node}, or {@link Mesh} will not
 * necessarily match the sum of the totals for each {@link Primitive}. Choose
 * the appropriate method for a relevant total or estimate:
 *
 * - {@link getSceneVertexCount}
 * - {@link getNodeVertexCount}
 * - {@link getMeshVertexCount}
 * - {@link getPrimitiveVertexCount}
 *
 * Many rendering features, such as volumetric transmission, may lead
 * to additional passes over some or all vertices. These tradeoffs are
 * implementation-dependent, and not considered here.
 */
export enum VertexCountMethod {
	/**
	 * Expected number of vertices processed by the vertex shader for one render
	 * pass, without considering the vertex cache.
	 */
	RENDER = 'render',

	/**
	 * Expected number of vertices processed by the vertex shader for one render
	 * pass, assuming an Average Transform to Vertex Ratio (ATVR) of 1. Approaching
	 * this result requires optimizing for locality of vertex references (see
	 * {@link reorder}).
	 *
	 * References:
	 * - [ACMR and ATVR](https://www.realtimerendering.com/blog/acmr-and-atvr/), Real-Time Rendering
	 */
	RENDER_CACHED = 'render-cached',

	/**
	 * Expected number of vertices uploaded to the GPU, assuming that a client
	 * uploads each unique {@link Accessor} only once. Unless glTF vertex
	 * attributes are pre-processed to a known buffer layout, and the client is
	 * optimized for that buffer layout, this total will be optimistic.
	 */
	UPLOAD = 'upload',

	/**
	 * Expected number of vertices uploaded to the GPU, assuming that a client
	 * uploads each unique {@link Primitive} individually, duplicating vertex
	 * attribute {@link Accessor Accessors} shared by multiple primitives, but
	 * never uploading the same Mesh or Primitive to GPU memory more than once.
	 */
	UPLOAD_NAIVE = 'upload-naive',

	/**
	 * Total number of unique vertices represented, considering all attributes of
	 * each vertex, and removing any duplicates. Has no direct relationship to
	 * runtime characteristics, but may be helpful in identifying asset
	 * optimization opportunities.
	 *
	 * @hidden TODO(feat): Not yet implemented.
	 * @internal
	 */
	DISTINCT = 'distinct',

	/**
	 * Total number of unique vertices represented, considering only vertex
	 * positions, and removing any duplicates. Has no direct relationship to
	 * runtime characteristics, but may be helpful in identifying asset
	 * optimization opportunities.
	 *
	 * @hidden TODO(feat): Not yet implemented.
	 * @internal
	 */
	DISTINCT_POSITION = 'distinct-position',

	/**
	 * Number of vertex positions never used by any {@link Primitive}. If all
	 * vertices are unused, this total will match `UPLOAD`.
	 */
	UNUSED = 'unused',
}

/**
 * Computes total number of vertices in a {@link Scene}, by the
 * specified method. Totals for the Scene will not necessarily match the sum
 * of the totals for each {@link Mesh} or {@link Primitive} within it. See
 * {@link VertexCountMethod} for available methods.
 */
export function getSceneVertexCount(scene: Scene, method: VertexCountMethod): number {
	return _getSubtreeVertexCount(scene, method);
}

/**
 * Computes total number of vertices in a {@link Node}, by the
 * specified method. Totals for the node will not necessarily match the sum
 * of the totals for each {@link Mesh} or {@link Primitive} within it. See
 * {@link VertexCountMethod} for available methods.
 */
export function getNodeVertexCount(node: Node | Scene, method: VertexCountMethod): number {
	return _getSubtreeVertexCount(node, method);
}

function _getSubtreeVertexCount(node: Node | Scene, method: VertexCountMethod): number {
	const instancedMeshes: [number, Mesh][] = [];
	const nonInstancedMeshes: Mesh[] = [];
	const meshes: Mesh[] = [];

	node.traverse((node) => {
		const mesh = node.getMesh();
		const batch = node.getExtension<InstancedMesh>('EXT_mesh_gpu_instancing');
		if (batch && mesh) {
			meshes.push(mesh);
			instancedMeshes.push([batch.listAttributes()[0]!.getCount(), mesh]);
		} else if (mesh) {
			meshes.push(mesh);
			nonInstancedMeshes.push(mesh);
		}
	});

	const prims = meshes.flatMap((mesh) => mesh.listPrimitives());
	const positions = prims.map((prim) => prim.getAttribute('POSITION')!);
	const uniquePositions = Array.from(new Set(positions));
	const uniqueMeshes = Array.from(new Set(meshes));
	const uniquePrims = Array.from(new Set(uniqueMeshes.flatMap((mesh) => mesh.listPrimitives())));

	switch (method) {
		case VertexCountMethod.RENDER:
		case VertexCountMethod.RENDER_CACHED:
			return (
				_sum(nonInstancedMeshes.map((mesh) => getMeshVertexCount(mesh, method))) +
				_sum(instancedMeshes.map(([batch, mesh]) => batch * getMeshVertexCount(mesh, method)))
			);
		case VertexCountMethod.UPLOAD_NAIVE:
			return _sum(uniqueMeshes.map((mesh) => getMeshVertexCount(mesh, method)));
		case VertexCountMethod.UPLOAD:
			return _sum(uniquePositions.map((attribute) => attribute.getCount()));
		case VertexCountMethod.DISTINCT:
		case VertexCountMethod.DISTINCT_POSITION:
			return _assertNotImplemented(method);
		case VertexCountMethod.UNUSED:
			return _sumUnused(uniquePrims);
		default:
			return _assertUnreachable(method);
	}
}

/**
 * Computes total number of vertices in a {@link Mesh}, by the
 * specified method. Totals for the Mesh will not necessarily match the sum
 * of the totals for each {@link Primitive} within it. See
 * {@link VertexCountMethod} for available methods.
 */
export function getMeshVertexCount(mesh: Mesh, method: VertexCountMethod): number {
	const prims = mesh.listPrimitives();
	const uniquePrims = Array.from(new Set(prims));
	const uniquePositions = Array.from(new Set(uniquePrims.map((prim) => prim.getAttribute('POSITION')!)));

	switch (method) {
		case VertexCountMethod.RENDER:
		case VertexCountMethod.RENDER_CACHED:
		case VertexCountMethod.UPLOAD_NAIVE:
			return _sum(prims.map((prim) => getPrimitiveVertexCount(prim, method)));
		case VertexCountMethod.UPLOAD:
			return _sum(uniquePositions.map((attribute) => attribute.getCount()));
		case VertexCountMethod.DISTINCT:
		case VertexCountMethod.DISTINCT_POSITION:
			return _assertNotImplemented(method);
		case VertexCountMethod.UNUSED:
			return _sumUnused(uniquePrims);
		default:
			return _assertUnreachable(method);
	}
}

/**
 * Computes total number of vertices in a {@link Primitive}, by the
 * specified method. See {@link VertexCountMethod} for available methods.
 */
export function getPrimitiveVertexCount(prim: Primitive, method: VertexCountMethod): number {
	const position = prim.getAttribute('POSITION')!;
	const indices = prim.getIndices();

	switch (method) {
		case VertexCountMethod.RENDER:
			return indices ? indices.getCount() : position.getCount();
		case VertexCountMethod.RENDER_CACHED:
			return indices ? new Set(indices.getArray()).size : position.getCount();
		case VertexCountMethod.UPLOAD_NAIVE:
		case VertexCountMethod.UPLOAD:
			return position.getCount();
		case VertexCountMethod.DISTINCT:
		case VertexCountMethod.DISTINCT_POSITION:
			return _assertNotImplemented(method);
		case VertexCountMethod.UNUSED:
			return indices ? position.getCount() - new Set(indices.getArray()).size : 0;
		default:
			return _assertUnreachable(method);
	}
}

function _sum(values: number[]): number {
	let total = 0;
	for (let i = 0; i < values.length; i++) {
		total += values[i];
	}
	return total;
}

function _sumUnused(prims: Primitive[]) {
	const attributeIndexMap = new Map<Accessor, Set<Accessor | null>>();
	for (const prim of prims) {
		const position = prim.getAttribute('POSITION')!;
		const indices = prim.getIndices();
		const indicesSet = attributeIndexMap.get(position) || new Set();
		indicesSet.add(indices);
		attributeIndexMap.set(position, indicesSet);
	}

	let unused = 0;
	for (const [position, indicesSet] of attributeIndexMap) {
		if (indicesSet.has(null)) continue;

		const usedIndices = new Uint8Array(position.getCount());
		for (const indices of indicesSet as Set<Accessor>) {
			const indicesArray = indices.getArray()!;
			for (let i = 0, il = indicesArray.length; i < il; i++) {
				usedIndices[indicesArray[i]] = 1;
			}
		}

		for (let i = 0, il = position.getCount(); i < il; i++) {
			if (usedIndices[i] === 0) unused++;
		}
	}

	return unused;
}

function _assertNotImplemented<T>(x: unknown): T {
	throw new Error(`Not implemented: ${x}`);
}

function _assertUnreachable<T>(x: never): T {
	throw new Error(`Unexpected value: ${x}`);
}
