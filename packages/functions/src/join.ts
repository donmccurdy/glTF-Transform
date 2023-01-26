import { Document, mat4, Mesh, Node, Primitive, PropertyType, Scene, Transform } from '@gltf-transform/core';
import { invert, multiply } from 'gl-matrix/mat4';
import { joinPrimitives } from './join-primitives';
import { prune } from './prune';
import { transformPrimitive } from './transform-primitive';
import { createPrimGroupKey, createTransform, isTransformPending } from './utils';

const NAME = 'join';

// prettier-ignore
const _matrix = [
	0, 0, 0, 0,
	0, 0, 0, 0,
	0, 0, 0, 0,
	0, 0, 0, 0,
] as mat4;

/** Options for the {@link join} function. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JoinOptions {
	/**
	 * Prevents {@link Node Nodes} and {@link Mesh Meshes} from being
	 * joined into fewer Meshes with multiple {@link Primitive Primitives}.
	 * Joins only Primitives found within the same parent Mesh. To preserve
	 * only _named_ Nodes and Meshes, use {@link JoinOptions.keepNamed}
	 * instead. Default: false.
	 */
	keepMeshes: boolean;
	/**
	 * Prevents _named_ {@link Node Nodes} and {@link Mesh Meshes} from being
	 * joined into fewer Meshes with multiple {@link Primitive Primitives}.
	 * If {@link JoinOptions.keepMeshes} is enabled, keepNamed will have
	 * no effect. Default: false.
	 */
	keepNamed: boolean;
}

export const JOIN_DEFAULTS: Required<JoinOptions> = {
	keepMeshes: false,
	keepNamed: false,
};

/**
 * TODO
 *
 * Example:
 *
 * ```ts
 * import { flatten, join } from '@gltf-transform/functions';
 *
 * await document.transform(
 * 	dedup(),
 * 	flatten(),
 * 	join(),
 * );
 * ```
 */
export function join(_options: JoinOptions = JOIN_DEFAULTS): Transform {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const options = { ...JOIN_DEFAULTS, ..._options } as Required<JoinOptions>;

	return createTransform(NAME, async (document: Document, context): Promise<void> => {
		const root = document.getRoot();
		const logger = document.getLogger();

		// (1) Scan for compatible primitives in sibling nodes.
		for (const scene of root.listScenes()) {
			_joinLevel(scene);
			scene.traverse(_joinLevel);
		}

		// (6) Clean up.
		if (!isTransformPending(context, NAME, 'prune')) {
			await document.transform(
				prune({
					propertyTypes: [
						PropertyType.NODE,
						PropertyType.MESH,
						PropertyType.PRIMITIVE,
						PropertyType.ACCESSOR,
					],
					keepLeaves: false,
					keepAttributes: true,
				})
			);
		}

		logger.debug(`${NAME}: Complete.`);
	});
}

interface IJoinGroup {
	key: string;
	prims: Primitive[];
	primMeshes: Mesh[];
	primNodes: Node[];
	dstNode: Node;
	dstMesh: Mesh;
}

function _joinLevel(parent: Node | Scene) {
	const groups = {} as Record<string, IJoinGroup>;

	// Scan for compatible Primitives.
	for (const node of parent.listChildren()) {
		// Skip nodes without meshes.
		const mesh = node.getMesh();
		if (!mesh) continue;

		// Skip nodes with instancing; unsupported.
		if (node.getExtension('EXT_mesh_gpu_instancing')) continue;

		// TODO(impl): Skip if node animated. Inherited animation?
		// TODO(design): What happens when a Mesh is reused throughout a Scene?

		for (const prim of mesh.listPrimitives()) {
			// Skip prims with morph targets; unsupported.
			if (prim.listTargets().length > 0) continue;

			// Skip prims with volumetric materials; unsupported.
			const material = prim.getMaterial();
			if (material && material.getExtension('KHR_materials_volume')) continue;

			const key = createPrimGroupKey(prim);
			if (!(key in groups)) {
				groups[key] = {
					prims: [] as Primitive[],
					primMeshes: [] as Mesh[],
					primNodes: [] as Node[],
					dstNode: node,
					dstMesh: mesh,
				} as IJoinGroup;
			}

			const group = groups[key];
			group.prims.push(prim);
			group.primMeshes.push(mesh);
			group.primNodes.push(node);
		}
	}

	// Discard single-Primitive groups.
	const joinGroups = Object.values(groups).filter(({ prims }) => prims.length > 1);

	// Bring prims into the local coordinate space of the target node, then join.
	for (const group of joinGroups) {
		const { prims, primNodes, dstNode } = group;
		const dstMatrix = dstNode.getMatrix();

		for (let i = 0; i < prims.length; i++) {
			const prim = prims[i];
			const primMatrix = primNodes[i].getMatrix();
			multiply(_matrix, invert(_matrix, primMatrix), dstMatrix); // TODO(test): 🚩
			transformPrimitive(prim, primMatrix);
		}

		group.dstMesh.addPrimitive(joinPrimitives(prims));
	}

	// Clean up.
	for (const group of joinGroups) {
		const { prims, primMeshes } = group;
		for (let i = 0; i < prims.length; i++) {
			primMeshes[i].removePrimitive(prims[i]);
		}
	}
	for (const group of joinGroups) {
		const { primMeshes } = group;
		for (let i = 0; i < primMeshes.length; i++) {
			const mesh = primMeshes[i];
			if (mesh.listPrimitives().length === 0) {
				mesh.dispose();
			}
		}
	}
}
