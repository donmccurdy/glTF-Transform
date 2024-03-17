import { Scene, Node, Mesh, Primitive } from '@gltf-transform/core';
import { InstancedMesh } from '@gltf-transform/extensions';

/**
 * Various methods of estimating a vertex count. For some background on why
 * multiple definitions of a vertex count should exist, see [_Vertex Count
 * Higher in Engine than in 3D Software_](https://shahriyarshahrabi.medium.com/vertex-count-higher-in-engine-than-in-3d-software-badc348ada66).
 *
 * Counts for a {@link Scene}, {@link Node}, or {@link Mesh} will not
 * necessarily match the sum of the counts for each {@link Primitive}. Choose
 * the appropriate method for a correct total or estimate:
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
	 * Expected number of vertices proceessed by the vertex shader for one render
	 * pass, assuming a 100% hit ratio on the vertex cache. Assumes vertex attributes
	 * have been optimized for locality of reused references (see {@link reorder}).
	 * Typical GPU vertex caches are small, holding 16-32 vertices, and rarely
	 * achieve 100% hit ratios in practice.
	 */
	RENDER_OPTIMISTIC = 'render-optimistic',
	/**
	 * Expected number of vertices uploaded to the GPU, assuming that a client
	 * uploads each unique {@link Primitive} individually, potentially duplicating
	 * reused vertex attributes {@link Accessor Accessors}, but never duplicating
	 * reused {@link Mesh Meshes} or {@link Primitive Primitives} in GPU memory.
	 */
	UPLOAD = 'upload',
	/**
	 * Expected number of vertices uploaded to the GPU, assuming that a client
	 * uploads each unique {@link Accessor} only once. Unless glTF vertex
	 * attributes are pre-processed to a known buffer layout, and the client is
	 * optimized for that buffer layout, this total will be optimistic.
	 */
	UPLOAD_OPTIMISTIC = 'upload-optimistic',
	/**
	 * Total number of unique vertices represented, considering all attributes of
	 * each vertex, and removing any duplicates.
	 *
	 * NOTE: Has no direct relationship to runtime characteristics, but may be
	 * helpful in identifying asset optimization opportunities.
	 *
	 * @hidden Not yet implemented.
	 */
	DISTINCT = 'distinct',
	/**
	 * Total number of unique vertices represented, considering aonly vertex
	 * positions, and removing any duplicates.
	 *
	 * NOTE: Has no direct relationship to runtime characteristics, but may be
	 * helpful in identifying asset optimization opportunities.
	 *
	 * @hidden Not yet implemented.
	 */
	DISTINCT_POSITION = 'distinct-position',
	/**
	 * Number of vertex positions never used by any mesh primitive.
	 *
	 * NOTE: Has no direct relationship to runtime characteristics, but may be
	 * helpful in identifying asset optimization opportunities.
	 *
	 * @hidden Not yet implemented.
	 */
	UNUSED = 'unused',
}

export function getSceneVertexCount(scene: Scene, method: VertexCountMethod): number {
	return _getSubtreeVertexCount(scene, method);
}

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

	switch (method) {
		case VertexCountMethod.RENDER:
		case VertexCountMethod.RENDER_OPTIMISTIC:
			return (
				_sum(nonInstancedMeshes.map((mesh) => getMeshVertexCount(mesh, method))) +
				_sum(instancedMeshes.map(([batch, mesh]) => batch * getMeshVertexCount(mesh, method)))
			);
		case VertexCountMethod.UPLOAD:
			return _sum(meshes.map((mesh) => getMeshVertexCount(mesh, method)));
		case VertexCountMethod.UPLOAD_OPTIMISTIC:
			return _sum(uniquePositions.map((attribute) => attribute.getCount()));
		case VertexCountMethod.DISTINCT:
		case VertexCountMethod.DISTINCT_POSITION:
		case VertexCountMethod.UNUSED:
			return _assertNotImplemented(method);
		default:
			return _assertUnreachable(method);
	}
}

export function getMeshVertexCount(mesh: Mesh, method: VertexCountMethod): number {
	const prims = mesh.listPrimitives();
	const uniquePrims = Array.from(new Set(prims));
	const uniquePositions = Array.from(new Set(uniquePrims.map((prim) => prim.getAttribute('POSITION')!)));

	switch (method) {
		case VertexCountMethod.RENDER:
		case VertexCountMethod.RENDER_OPTIMISTIC:
		case VertexCountMethod.UPLOAD:
			return _sum(prims.map((prim) => getPrimitiveVertexCount(prim, method)));
		case VertexCountMethod.UPLOAD_OPTIMISTIC:
			return _sum(uniquePositions.map((attribute) => attribute.getCount()));
		case VertexCountMethod.DISTINCT:
		case VertexCountMethod.DISTINCT_POSITION:
		case VertexCountMethod.UNUSED:
			return _assertNotImplemented(method);
		default:
			return _assertUnreachable(method);
	}
}

export function getPrimitiveVertexCount(prim: Primitive, method: VertexCountMethod): number {
	const position = prim.getAttribute('POSITION')!;
	const indices = prim.getIndices();

	switch (method) {
		case VertexCountMethod.RENDER:
			return indices ? indices.getCount() : position.getCount();
		case VertexCountMethod.RENDER_OPTIMISTIC:
			return indices ? new Set(indices.getArray()).size : position.getCount();
		case VertexCountMethod.UPLOAD:
		case VertexCountMethod.UPLOAD_OPTIMISTIC:
			return position.getCount();
		case VertexCountMethod.DISTINCT:
		case VertexCountMethod.DISTINCT_POSITION:
			return _assertNotImplemented(method);
		case VertexCountMethod.UNUSED:
			return position.getCount() - (indices ? new Set(indices.getArray()).size : position.getCount());
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

function _assertNotImplemented<T>(x: unknown): T {
	throw new Error(`Not implemented: ${x}`);
}

function _assertUnreachable<T>(x: never): T {
	throw new Error(`Unexpected value: ${x}`);
}
