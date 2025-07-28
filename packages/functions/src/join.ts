import {
	AnimationChannel,
	type Document,
	type Mesh,
	type mat4,
	type Node,
	type Primitive,
	PropertyType,
	type Scene,
	type Transform,
} from '@gltf-transform/core';
import { invert, multiply } from 'gl-matrix/mat4';
import { compactPrimitive } from './compact-primitive.js';
import { dequantizeAttribute } from './dequantize.js';
import { joinPrimitives } from './join-primitives.js';
import { prune } from './prune.js';
import { transformPrimitive } from './transform-primitive.js';
import { assignDefaults, createPrimGroupKey, createTransform, formatLong, isUsed } from './utils.js';

const NAME = 'join';

const { ROOT, NODE, MESH, PRIMITIVE, ACCESSOR } = PropertyType;

// biome-ignore format: Readability.
const _matrix = [
	0, 0, 0, 0,
	0, 0, 0, 0,
	0, 0, 0, 0,
	0, 0, 0, 0,
] as mat4;

/** Options for the {@link join} function. */
export interface JoinOptions {
	/**
	 * Prevents joining distinct {@link Mesh Meshes} and {@link Node Nodes}.
	 * Joins only Primitives found within the same parent Mesh. To preserve
	 * only _named_ Nodes and Meshes, use
	 * {@link JoinOptions.keepNamed keepNamed} instead. Default: false.
	 */
	keepMeshes?: boolean;
	/**
	 * Prevents joining _named_ {@link Mesh Meshes} and {@link Node Nodes}.
	 * If {@link JoinOptions.keepMeshes keepMeshes} is enabled, keepNamed will
	 * have no effect. Default: false.
	 */
	keepNamed?: boolean;
	/**
	 * Whether to perform cleanup steps after completing the operation. Recommended, and enabled by
	 * default. Cleanup removes temporary resources created during the operation, but may also remove
	 * pre-existing unused or duplicate resources in the {@link Document}. Applications that require
	 * keeping these resources may need to disable cleanup, instead calling {@link dedup} and
	 * {@link prune} manually (with customized options) later in the processing pipeline.
	 * @experimental
	 */
	cleanup?: boolean;
	/**
	 * A filter function used to evaluate a condition on a given {@link Node Node}.
	 * This function should return a boolean indicating whether the node
	 * satisfies the provided condition.
	 *
	 * @param {Node} node - The node instance to be evaluated.
	 * @returns {boolean} - The result of the evaluation; `true` if the condition is met, otherwise `false`.
	 */
	filter?: (node: Node) => boolean;
}

export const JOIN_DEFAULTS: Required<JoinOptions> = {
	keepMeshes: false,
	keepNamed: false,
	cleanup: true,
	filter: () => true,
};

/**
 * Joins compatible {@link Primitive Primitives} and reduces draw calls.
 * Primitives are eligible for joining if they are members of the same
 * {@link Mesh} or, optionally, attached to sibling {@link Node Nodes}
 * in the scene hierarchy. For best results, apply {@link dedup} and
 * {@link flatten} first to maximize the number of Primitives that
 * can be joined.
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
 *
 * @category Transforms
 */
export function join(_options: JoinOptions = JOIN_DEFAULTS): Transform {
	const options = assignDefaults(JOIN_DEFAULTS, _options);

	return createTransform(NAME, async (document: Document): Promise<void> => {
		const root = document.getRoot();
		const logger = document.getLogger();

		// Join.
		for (const scene of root.listScenes()) {
			_joinLevel(document, scene, options);
			scene.traverse((node) => _joinLevel(document, node, options));
		}

		// Clean up.
		if (options.cleanup) {
			await document.transform(
				prune({
					propertyTypes: [NODE, MESH, PRIMITIVE, ACCESSOR],
					keepAttributes: true,
					keepIndices: true,
					keepLeaves: false,
				}),
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
	dstMesh?: Mesh | undefined;
}

function _joinLevel(document: Document, parent: Node | Scene, options: Required<JoinOptions>) {
	const logger = document.getLogger();
	const groups = {} as Record<string, IJoinGroup>;

	// Scan for compatible Primitives.
	const children = parent.listChildren();
	for (let nodeIndex = 0; nodeIndex < children.length; nodeIndex++) {
		const node = children[nodeIndex];

		// Skip nodes not matching the filter.
		if (!options.filter(node)) continue;

		// Skip animated nodes.
		const isAnimated = node.listParents().some((p) => p instanceof AnimationChannel);
		if (isAnimated) continue;

		// Skip nodes without meshes.
		const mesh = node.getMesh();
		if (!mesh) continue;

		// Skip nodes with instancing; unsupported.
		if (node.getExtension('EXT_mesh_gpu_instancing')) continue;

		// Skip nodes with skinning; unsupported.
		if (node.getSkin()) continue;

		for (const prim of mesh.listPrimitives()) {
			// Skip prims with morph targets; unsupported.
			if (prim.listTargets().length > 0) continue;

			// Skip prims with volumetric materials; unsupported.
			const material = prim.getMaterial();
			if (material && material.getExtension('KHR_materials_volume')) continue;

			compactPrimitive(prim);
			dequantizeTransformableAttributes(prim);

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
					dstMesh: undefined,
				} as IJoinGroup;
			}

			const group = groups[key];
			group.prims.push(prim);
			group.primNodes.push(node);
		}
	}

	// Discard single-Primitive groups.
	const joinGroups = Object.values(groups).filter(({ prims }) => prims.length > 1);

	// Unlink all affected Meshes at current level, before modifying Primitives.
	const srcNodes = new Set<Node>(joinGroups.flatMap((group) => group.primNodes));
	for (const node of srcNodes) {
		const mesh = node.getMesh()!;
		const isSharedMesh = mesh.listParents().some((parent) => {
			return parent.propertyType !== ROOT && node !== parent;
		});
		if (isSharedMesh) {
			node.setMesh(mesh.clone());
		}
	}

	// Update Meshes in groups.
	for (const group of joinGroups) {
		const { dstNode, primNodes } = group;
		group.dstMesh = dstNode.getMesh()!;
		group.primMeshes = primNodes.map((node) => node.getMesh()!);
	}

	// Join Primitives.
	for (const group of joinGroups) {
		const { prims, primNodes, primMeshes, dstNode, dstMesh } = group as Required<IJoinGroup>;
		const dstMatrix = dstNode.getMatrix();

		for (let i = 0; i < prims.length; i++) {
			const primNode = primNodes[i];
			const primMesh = primMeshes[i];

			let prim = prims[i];
			primMesh.removePrimitive(prim);

			// If Primitive is still in use after being removed from the
			// current mesh, above, make a deep copy. Because compactPrimitive()
			// was applied earlier in join(), we know the full vertex streams are
			// used, and no accessors are shared.
			if (isUsed(prim)) {
				prim = prims[i] = _deepClonePrimitive(prims[i]);
			}

			// Transform Primitive into new local coordinate space.
			if (primNode !== dstNode) {
				multiply(_matrix, invert(_matrix, dstMatrix), primNode.getMatrix());
				transformPrimitive(prim, _matrix);
			}
		}

		const dstPrim = joinPrimitives(prims);
		const dstVertexCount = dstPrim.listAttributes()[0].getCount();
		dstMesh.addPrimitive(dstPrim);

		logger.debug(
			`${NAME}: Joined Primitives (${prims.length}) containing ` +
				`${formatLong(dstVertexCount)} vertices under Node "${dstNode.getName()}".`,
		);
	}
}

function _deepClonePrimitive(src: Primitive): Primitive {
	// compactPrimitive already applied; no vertices are unused.
	const dst = src.clone();
	for (const semantic of dst.listSemantics()) {
		dst.setAttribute(semantic, dst.getAttribute(semantic)!.clone());
	}
	const indices = dst.getIndices();
	if (indices) dst.setIndices(indices.clone());
	return dst;
}

/**
 * Dequantize attributes that would be affected by {@link transformPrimitive},
 * to avoid invalidating our primitive group keys.
 *
 * See: https://github.com/donmccurdy/glTF-Transform/issues/844
 */
function dequantizeTransformableAttributes(prim: Primitive) {
	for (const semantic of ['POSITION', 'NORMAL', 'TANGENT']) {
		const attribute = prim.getAttribute(semantic);
		if (attribute) dequantizeAttribute(attribute);
	}
}
