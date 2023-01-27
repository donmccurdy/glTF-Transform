import {
	AnimationChannel,
	Document,
	mat4,
	Mesh,
	Node,
	Primitive,
	PropertyType,
	Scene,
	Transform,
} from '@gltf-transform/core';
import { invert, multiply } from 'gl-matrix/mat4';
import { joinPrimitives } from './join-primitives';
import { prune } from './prune';
import { transformPrimitive } from './transform-primitive';
import { createPrimGroupKey, createTransform, formatLong, isTransformPending } from './utils';

const NAME = 'join';

const { ROOT, NODE, MESH, PRIMITIVE, ACCESSOR } = PropertyType;

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
 * Joins compatible {@link Primitive Primitives} and reduces draw calls.
 * Primitives are eligible for joining if they are members of the same
 * {@link Mesh} or, optionally, attached to sibling {@link Node Nodes}
 * in the scene hierarchy. For best results, apply {@link dedup} and
 * {@link flatten} before joining, to maximize the number of Primitives
 * that can be joined.
 *
 * NOTE: In a Scene that heavily reuses the same Mesh data, joining may
 * increase vertex count. Consider alternatives, like
 * {@link instance instancing} with {@link EXTMeshGPUInstancing}.
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
					propertyTypes: [NODE, MESH, PRIMITIVE, ACCESSOR],
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
	const children = parent.listChildren();
	for (let nodeIndex = 0; nodeIndex < children.length; nodeIndex++) {
		const node = children[nodeIndex];

		// Skip animated nodes.
		const isAnimated = node.listParents().some((p) => p instanceof AnimationChannel);
		if (isAnimated) continue;

		// Skip nodes without meshes.
		const mesh = node.getMesh();
		if (!mesh) continue;

		// Skip nodes with instancing; unsupported.
		if (node.getExtension('EXT_mesh_gpu_instancing')) continue;

		for (const prim of mesh.listPrimitives()) {
			// Skip prims with morph targets; unsupported.
			if (prim.listTargets().length > 0) continue;

			// Skip prims with volumetric materials; unsupported.
			const material = prim.getMaterial();
			if (material && material.getExtension('KHR_materials_volume')) continue;

			let key = createPrimGroupKey(prim);

			const isNamed = mesh.getName() || node.getName();
			if (options.keepMeshes || (options.keepNamed && isNamed)) {
				key += `|${nodeIndex}`;
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

	// Unlink reused Meshes before modifying.
	for (const group of joinGroups) {
		const { primNodes, primMeshes } = group;
		const groupMeshes = new Set<Mesh>();
		for (let i = 0; i < primNodes.length; i++) {
			const node = primNodes[i];
			const mesh = primMeshes[i];
			const isSharedMesh = mesh.listParents().some((parent) => {
				if (parent.propertyType === NODE) return parent !== node;
				return parent.propertyType !== ROOT;
			});
			if (isSharedMesh && !groupMeshes.has(mesh)) {
				primMeshes[i] = mesh.clone();
				node.setMesh(primMeshes[i]);
				groupMeshes.add(mesh);
			}
		}
	}

	// Bring prims into the local coordinate space of the target node, then join.
	for (const group of joinGroups) {
		const { prims, primNodes, primMeshes, dstNode, dstMesh } = group;
		const dstMatrix = dstNode.getMatrix();

		for (let i = 0; i < prims.length; i++) {
			const primNode = primNodes[i];
			const primMesh = primMeshes[i];
			if (primNode === dstNode) continue;

			// Unlink reused Primitives before transforming.
			let prim = prims[i];
			if (_isSharedPrimitive(prim, primMesh)) {
				prim = prims[i] = _deepClonePrimitive(prims[i]);
			}

			multiply(_matrix, invert(_matrix, dstMatrix), primNode.getMatrix());
			transformPrimitive(prim, _matrix);
		}

		const dstPrim = joinPrimitives(prims);
		const dstVertexCount = dstPrim.listAttributes()[0].getCount();
		dstMesh.addPrimitive(dstPrim);

		logger.debug(
			`${NAME}: Joined Primitives (${prims.length}) containing ` +
				`${formatLong(dstVertexCount)} vertices under Node "${dstNode.getName()}".`
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

function _isSharedPrimitive(prim: Primitive, mesh: Mesh): boolean {
	return prim.listParents().some((parent) => parent !== mesh);
}

function _deepClonePrimitive(src: Primitive): Primitive {
	const dst = src.clone();
	for (const semantic of dst.listSemantics()) {
		dst.setAttribute(semantic, dst.getAttribute(semantic)!.clone());
	}
	const indices = dst.getIndices();
	if (indices) dst.setIndices(indices.clone());
	return dst;
}
