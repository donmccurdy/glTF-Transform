import { Document, Logger, MathUtils, Mesh, Node, Transform, vec3, vec4 } from '@gltf-transform/core';
import { InstancedMesh, MeshGPUInstancing } from '@gltf-transform/extensions';

const NAME = 'instance';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface InstanceOptions {}

const INSTANCE_DEFAULTS: Required<InstanceOptions> = {};

/**
 * Creates GPU instances (with `EXT_mesh_gpu_instancing`) for shared {@link Mesh} references. No
 * options are currently implemented for this function.
 */
export function instance (_options: InstanceOptions = INSTANCE_DEFAULTS): Transform {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const options = {...INSTANCE_DEFAULTS, ..._options} as Required<InstanceOptions>;

	return (doc: Document): void => {
		const logger = doc.getLogger();
		const root = doc.getRoot();
		const batchExtension = doc.createExtension(MeshGPUInstancing);

		if (root.listAnimations().length) {
			throw new Error(`${NAME}: Instancing is not currently supported for animated models.`);
		}

		let numBatches = 0;
		let numInstances = 0;

		for (const scene of root.listScenes()) {
			// Gather a one-to-many Mesh/Node mapping, identifying what we can instance.
			const meshInstances = new Map<Mesh, Set<Node>>();
			scene.traverse((node) => {
				const mesh = node.getMesh();
				if (!mesh) return;
				meshInstances.set(mesh, (meshInstances.get(mesh) || new Set<Node>()).add(node));
			});

			// For each Mesh, create an InstancedMesh and collect transforms.
			const modifiedNodes = [];
			for (const mesh of Array.from(meshInstances.keys())) {
				const nodes = Array.from(meshInstances.get(mesh)!);
				if (nodes.length < 2) continue;
				if (nodes.some((node) => node.getSkin())) continue;

				const batch = createBatch(doc, batchExtension, mesh, nodes.length);
				const batchTranslation = batch.getAttribute('TRANSLATION')!;
				const batchRotation = batch.getAttribute('ROTATION')!;
				const batchScale = batch.getAttribute('SCALE')!;

				const batchNode = doc.createNode()
					.setMesh(mesh)
					.setExtension('EXT_mesh_gpu_instancing', batch);
				scene.addChild(batchNode);

				let needsTranslation = false;
				let needsRotation = false;
				let needsScale = false;

				// For each Node, write TRS properties into instance attributes.
				for (let i = 0; i < nodes.length; i++) {
					let t: vec3, r: vec4, s: vec3;
					const node = nodes[i];

					batchTranslation.setElement(i, t = node.getWorldTranslation());
					batchRotation.setElement(i, r = node.getWorldRotation());
					batchScale.setElement(i, s = node.getWorldScale());

					if (!MathUtils.eq(t, [0, 0, 0])) needsTranslation = true;
					if (!MathUtils.eq(r, [0, 0, 0, 1])) needsRotation = true;
					if (!MathUtils.eq(s, [1, 1, 1])) needsScale = true;

					// Mark the node for cleanup.
					node.setMesh(null);
					modifiedNodes.push(node);
				}

				if (!needsTranslation) batchTranslation.dispose();
				if (!needsRotation) batchRotation.dispose();
				if (!needsScale) batchScale.dispose();

				pruneUnusedNodes(modifiedNodes, logger);

				numBatches++;
				numInstances += nodes.length;
			}
		}

		if (numBatches > 0) {
			logger.info(
				`${NAME}: Created ${numBatches} batches, with ${numInstances} total instances.`
			);
		} else {
			logger.info(`${NAME}: No meshes with multiple parent nodes were found.`);
			batchExtension.dispose();
		}

		logger.debug(`${NAME}: Complete.`);
	};

}

function pruneUnusedNodes(nodes: Node[], logger: Logger): void {
	let node: Node | undefined;
	let unusedNodes = 0;
	while ((node = nodes.pop())) {
		if (node.listChildren().length
				|| node.getCamera()
				|| node.getMesh()
				|| node.getSkin()
				|| node.listExtensions().length) {
			continue;
		}
		const nodeParent = node.getParent();
		if (nodeParent instanceof Node) {
			nodes.push(nodeParent);
		}
		node.dispose();
		unusedNodes++;
	}

	logger.debug(`${NAME}: Removed ${unusedNodes} unused nodes.`);
}

function createBatch(
		doc: Document,
		batchExtension: MeshGPUInstancing,
		mesh: Mesh,
		count: number): InstancedMesh {
	const buffer = mesh.listPrimitives()[0].getAttribute('POSITION')!.getBuffer();

	const batchTranslation = doc.createAccessor()
		.setType('VEC3')
		.setArray(new Float32Array(3 * count))
		.setBuffer(buffer);
	const batchRotation = doc.createAccessor()
		.setType('VEC4')
		.setArray(new Float32Array(4 * count))
		.setBuffer(buffer);
	const batchScale = doc.createAccessor()
		.setType('VEC3')
		.setArray(new Float32Array(3 * count))
		.setBuffer(buffer);

	return batchExtension.createInstancedMesh()
		.setAttribute('TRANSLATION', batchTranslation)
		.setAttribute('ROTATION', batchRotation)
		.setAttribute('SCALE', batchScale);
}
