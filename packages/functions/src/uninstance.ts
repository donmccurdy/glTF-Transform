import { type Accessor, Document, type Node, type Transform } from '@gltf-transform/core';
import { EXTMeshGPUInstancing, type InstancedMesh } from '@gltf-transform/extensions';
import { createTransform } from './utils.js';

const NAME = 'uninstance';

export interface UninstanceOptions {}
const UNINSTANCE_DEFAULTS: Required<UninstanceOptions> = {};

/**
 * Removes extension {@link EXTMeshGPUInstancing}, reversing the effects of the
 * {@link instance} transform or similar instancing operations. For each {@link Node}
 * associated with an {@link InstancedMesh}, the Node's {@link Mesh} and InstancedMesh will
 * be detached. In their place, one Node per instance will be attached to the original
 * Node as children, associated with the same Mesh. The extension, `EXT_mesh_gpu_instancing`,
 * will be removed from the {@link Document}.
 *
 * In applications that support `EXT_mesh_gpu_instancing`, removing the extension
 * is likely to substantially increase draw calls and reduce performance. Removing
 * the extension may be helpful for compatibility in applications without such support.
 *
 * Example:
 *
 * ```ts
 * import { uninstance } from '@gltf-transform/functions';
 *
 * document.getRoot().listNodes(); // → [ Node x 10 ]
 *
 * await document.transform(uninstance());
 *
 * document.getRoot().listNodes(); // → [ Node x 1000 ]
 * ```
 *
 * @category Transforms
 */
export function uninstance(_options: UninstanceOptions = UNINSTANCE_DEFAULTS): Transform {
	return createTransform(NAME, async (document: Document): Promise<void> => {
		const logger = document.getLogger();
		const root = document.getRoot();

		const instanceAttributes = new Set<Accessor>();

		for (const srcNode of document.getRoot().listNodes()) {
			const batch = srcNode.getExtension<InstancedMesh>('EXT_mesh_gpu_instancing');
			if (!batch) continue;

			// For each instance, attach a new Node under the source Node.
			for (const instanceNode of createInstanceNodes(srcNode)) {
				srcNode.addChild(instanceNode);
			}

			for (const instanceAttribute of batch.listAttributes()) {
				instanceAttributes.add(instanceAttribute);
			}

			srcNode.setMesh(null);
			batch.dispose();
		}

		// Clean up unused instance attributes.
		for (const attribute of instanceAttributes) {
			if (attribute.listParents().every((parent) => parent === root)) {
				attribute.dispose();
			}
		}

		// Remove Extension from Document.
		document.createExtension(EXTMeshGPUInstancing).dispose();

		logger.debug(`${NAME}: Complete.`);
	});
}

/**
 * Given a {@link Node} with an {@link InstancedMesh} extension, returns a list
 * containing one Node per instance in the InstancedMesh. Each Node will have
 * the transform (translation/rotation/scale) of the corresponding instance,
 * and will be assigned to the same {@link Mesh}.
 *
 * May be used to unpack instancing previously applied with {@link instance}
 * and {@link EXTMeshGPUInstancing}. For a transform that applies this operation
 * to the entire {@link Document}, see {@link uninstance}.
 *
 * Example:
 * ```javascript
 * import { createInstanceNodes } from '@gltf-transform/functions';
 *
 * for (const instanceNode of createInstanceNodes(batchNode)) {
 *  batchNode.addChild(instanceNode);
 * }
 *
 * batchNode.setMesh(null).setExtension('EXTMeshGPUInstancing', null);
 * ```
 */
export function createInstanceNodes(batchNode: Node): Node[] {
	const batch = batchNode.getExtension<InstancedMesh>('EXT_mesh_gpu_instancing');
	if (!batch) return [];

	const semantics = batch.listSemantics();
	if (semantics.length === 0) return [];

	const document = Document.fromGraph(batchNode.getGraph())!;
	const instanceCount = batch.listAttributes()[0].getCount();
	const instanceCountDigits = String(instanceCount).length;
	const mesh = batchNode.getMesh();
	const batchName = batchNode.getName();

	const instanceNodes = [];

	// For each instance construct a Node, assign attributes, and push to list.
	for (let i = 0; i < instanceCount; i++) {
		const instanceNode = document.createNode().setMesh(mesh);

		// MyNode_001, MyNode_002, ...
		if (batchName) {
			const paddedIndex = String(i).padStart(instanceCountDigits, '0');
			instanceNode.setName(`${batchName}_${paddedIndex}`);
		}

		// TRS attributes are applied to node transform; all other attributes are extras.
		for (const semantic of semantics) {
			const attribute = batch.getAttribute(semantic)!;
			switch (semantic) {
				case 'TRANSLATION':
					instanceNode.setTranslation(attribute.getElement(i, [0, 0, 0]));
					break;
				case 'ROTATION':
					instanceNode.setRotation(attribute.getElement(i, [0, 0, 0, 1]));
					break;
				case 'SCALE':
					instanceNode.setScale(attribute.getElement(i, [1, 1, 1]));
					break;
				default:
					_setInstanceExtras(instanceNode, semantic, attribute, i);
			}
		}

		instanceNodes.push(instanceNode);
	}

	return instanceNodes;
}

function _setInstanceExtras(node: Node, semantic: string, attribute: Accessor, index: number): void {
	const value = attribute.getType() === 'SCALAR' ? attribute.getScalar(index) : attribute.getElement(index, []);
	node.setExtras({ ...node.getExtras(), [semantic]: value });
}
