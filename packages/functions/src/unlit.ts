import type { Document, Transform } from '@gltf-transform/core';
import { KHRMaterialsUnlit } from '@gltf-transform/extensions';

/**
 * @category Transforms
 */
export function unlit(): Transform {
	return (doc: Document): void => {
		const unlitExtension = doc.createExtension(KHRMaterialsUnlit) as KHRMaterialsUnlit;
		const unlit = unlitExtension.createUnlit();
		doc.getRoot()
			.listMaterials()
			.forEach((material) => {
				material.setExtension('KHR_materials_unlit', unlit);
			});
	};
}
