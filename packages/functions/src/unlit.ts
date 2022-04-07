import type { Document, Transform } from '@gltf-transform/core';
import { MaterialsUnlit } from '@gltf-transform/extensions';

export const unlit = (): Transform => {
	return (doc: Document): void => {
		const unlitExtension = doc.createExtension(MaterialsUnlit) as MaterialsUnlit;
		const unlit = unlitExtension.createUnlit();
		doc.getRoot()
			.listMaterials()
			.forEach((material) => {
				material.setExtension('KHR_materials_unlit', unlit);
			});
	};
};
