import { Document, Mesh, Node, Transform, vec3, vec4 } from '@gltf-transform/core';
import { InstancedMesh, MeshGPUInstancing } from '@gltf-transform/extensions';

const NAME = 'instance';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface InstanceOptions {}

const DEFAULT_OPTIONS: InstanceOptions = {};

/** Creates instance batches (with EXT_mesh_gpu_instancing) for shared {@link Mesh} references. */
export function instance (_options: InstanceOptions = DEFAULT_OPTIONS): Transform {

	return (doc: Document): void => {
		const logger = doc.getLogger();
		const root = doc.getRoot();
		const batchExtension = doc.createExtension(MeshGPUInstancing);

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
			for (const mesh of Array.from(meshInstances.keys())) {
				const nodes = Array.from(meshInstances.get(mesh));
				if (nodes.length < 2) continue;
				if (nodes.some((node) => node.getSkin())) continue;

				const batch = createBatch(doc, batchExtension, mesh, nodes.length);
				const batchTranslation = batch.getAttribute('TRANSLATION');
				const batchRotation = batch.getAttribute('ROTATION');
				const batchScale = batch.getAttribute('SCALE');

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

					if (!eq(t, [0, 0, 0])) needsTranslation = true;
					if (!eq(r, [0, 0, 0, 1])) needsRotation = true;
					if (!eq(s, [1, 1, 1])) needsScale = true;

					// Clean up the old node.
					if (!node.listChildren().length
						&& !node.getCamera()
						&& !node.listExtensions().length) {
						node.dispose();
					} else {
						node.setMesh(null);
					}
				}

				if (!needsTranslation) batchTranslation.dispose();
				if (!needsRotation) batchRotation.dispose();
				if (!needsScale) batchScale.dispose();

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

function createBatch(
		doc: Document,
		batchExtension: MeshGPUInstancing,
		mesh: Mesh,
		count: number): InstancedMesh {
	const buffer = mesh.listPrimitives()[0].getAttribute('POSITION').getBuffer();

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

function eq(a: number[], b: number[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}
