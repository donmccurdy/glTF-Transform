import { Document, mat4, Mesh, Node, Primitive, PropertyType, Scene, Transform } from '@gltf-transform/core';
import { invert, multiply } from 'gl-matrix/mat4';
import { joinPrimitives } from './join-primitives';
import { prune } from './prune';
import { transformPrimitive } from './transform-primitive';
import { createPrimGroupKey, createTransform, formatLong, isTransformPending } from './utils';

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
 * import { PropertyType } from '@gltf-transform/core';
 * import { join, flatten, dedup } from '@gltf-transform/functions';
 *
 * await document.transform(
 * 	dedup({ propertyTypes: [PropertyType.MATERIAL] }),
 * 	flatten(),
 * 	join({ keepNamed: false }),
 * );
 * ```
 */
export function join(_options: JoinOptions = JOIN_DEFAULTS): Transform {
	const options = { ...JOIN_DEFAULTS, ..._options } as Required<JoinOptions>;

	return createTransform(NAME, async (document: Document, context): Promise<void> => {
		const root = document.getRoot();
		const logger = document.getLogger();

		// Join.
		for (const scene of root.listScenes()) {
			_joinLevel(document, scene, options);
			scene.traverse((node) => _joinLevel(document, node, options));
		}

		// Clean up.
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

function _joinLevel(document: Document, parent: Node | Scene, options: Required<JoinOptions>) {
	const logger = document.getLogger();
	const groups = {} as Record<string, IJoinGroup>;

	// Scan for compatible Primitives.
	for (const node of parent.listChildren()) {
		// Skip nodes without meshes.
		const mesh = node.getMesh();
		if (!mesh) continue;

		// Skip nodes with instancing; unsupported.
		if (node.getExtension('EXT_mesh_gpu_instancing')) continue;

		// TODO(🚩): Skip Nodes with animation (direct? inherited?).
		// TODO(🚩): Handle reused Mesh, Primitive, or Accessor.

		const meshIndex = document.getRoot().listMeshes().indexOf(mesh);
		for (const prim of mesh.listPrimitives()) {
			// Skip prims with morph targets; unsupported.
			if (prim.listTargets().length > 0) continue;

			// Skip prims with volumetric materials; unsupported.
			const material = prim.getMaterial();
			if (material && material.getExtension('KHR_materials_volume')) continue;

			let key = createPrimGroupKey(prim);

			if (options.keepMeshes || (options.keepNamed && mesh.getName())) {
				key += `|${meshIndex}`;
			}

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
		const { prims, primNodes, dstNode, dstMesh } = group;
		const dstMatrix = dstNode.getMatrix();

		for (let i = 0; i < prims.length; i++) {
			const prim = prims[i].clone();
			const primNode = primNodes[i];
			if (primNode === dstNode) continue;

			multiply(_matrix, invert(_matrix, dstMatrix), primNode.getMatrix());
			transformPrimitive(prim, _matrix);
		}

		const dstPrim = joinPrimitives(prims);
		const dstVertexCount = dstPrim.listAttributes()[0].getCount();
		dstMesh.addPrimitive(dstPrim);

		logger.debug(
			`${NAME}: Joined ${prims.length} Primitives and ` +
				`${formatLong(dstVertexCount)} vertices at Node "${dstNode.getName()}".`
		);
	}

	// Partial cleanup, defer the rest to join().
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
