import { Document, Mesh, Node, PropertyType, Scene, Transform } from '@gltf-transform/core';
import { MappingList, MaterialsVariants } from '@gltf-transform/extensions';
import { dedup } from './dedup';
import { prune } from './prune';

const NAME = 'variant';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VariantOptions {}

const DEFAULT_OPTIONS: VariantOptions = {};

/** TODO */
export function variant (_options: VariantOptions = DEFAULT_OPTIONS): Transform {

	return async (doc: Document): Promise<void> => {
		const logger = doc.getLogger();
		const root = doc.getRoot();

		// TODO(bug): It would be very useful if duplicate _extensions_ could be detected. I'm not
		// sure how to implement that reusably, without adding it to the ExtensionProperty API.
		// Perhaps a toHashKey() method would be enough.
		//
		// As it is, this extension does not attempt to detect reuse of materials or their
		// extensions. Switching variants will therefore replace _all_ materials, and that's not
		// exactly ideal.
		await doc.transform(dedup({propertyTypes: [PropertyType.TEXTURE]}));

		if (root.listScenes().length < 2) {
			throw new Error(`${NAME}: At least two (2) scenes are required to create variants.`);
		}

		const variantExtension = doc.createExtension(MaterialsVariants);
		const scenes = root.listScenes();
		const dstScene = scenes[0];

		for (let i = 1; i < scenes.length; i++) {
			logger.debug(`${NAME}: Melding "${scenes[i].getName()}" into base scene.`);
			meld(variantExtension, scenes[i], dstScene);
		}

		await doc.transform(prune());

		logger.debug(`${NAME}: Complete.`);
	};

}

function meld(variantExtension: MaterialsVariants, srcScene: Scene, dstScene: Scene): void {
	const srcMeshes = listMeshes(srcScene);
	const dstMeshes = listMeshes(dstScene);

	const variant = variantExtension.createVariant(srcScene.getName());

	if (srcMeshes.length !== dstMeshes.length) {
		throw new Error(
			`${NAME}: Mismatch in number of meshes for scenes`
			+ ` "${srcScene.getName()}" and "${dstScene.getName()}".`
		);
	}

	for (let i = 0; i < dstMeshes.length; i++) {
		const dstPrims = dstMeshes[i].listPrimitives();
		const srcPrims = srcMeshes[i].listPrimitives();

		for (let j = 0; j < dstPrims.length; j++) {
			const dstPrim = dstPrims[j];
			const srcPrim = srcPrims[j];

			const mapping = variantExtension.createMapping()
				.setMaterial(srcPrim.getMaterial())
				.addVariant(variant);

			const mappingList = dstPrim.getExtension<MappingList>('KHR_materials_variants')
				|| variantExtension.createMappingList();
			mappingList.addMapping(mapping);

			dstPrim.setExtension('KHR_materials_variants', mappingList);
		}
	}

	srcScene.dispose();
}

function listMeshes(scene: Scene): Mesh[] {
	const meshes = [];
	scene.traverse((node: Node) => {
		const mesh = node.getMesh();
		if (mesh) meshes.push(mesh);
	});
	return meshes;
}
