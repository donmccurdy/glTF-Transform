import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_MATERIALS_IOR } from '../constants';
import { IOR } from './ior';

const NAME = KHR_MATERIALS_IOR;

/** Documentation in {@link EXTENSIONS.md}. */
export class MaterialsIOR extends Extension {
	public readonly extensionName = NAME;
	public static readonly EXTENSION_NAME = NAME;

	public createIOR(): IOR {
		return new IOR(this.doc.getGraph(), this);
	}

	public read(context: ReaderContext): this {
		const nativeDoc = context.nativeDocument;
		const materialDefs = nativeDoc.json.materials || [];
		materialDefs.forEach((materialDef, materialIndex) => {
			if (materialDef.extensions && materialDef.extensions[NAME]) {
				const ior = this.createIOR();
				context.materials[materialIndex].setExtension(NAME, ior);

				// Factors.

				if (materialDef.extensions[NAME].ior !== undefined) {
					ior.setIOR(materialDef.extensions[NAME].ior);
				}
			}
		});

		return this;
	}

	public write(context: WriterContext): this {
		const nativeDoc = context.nativeDocument;

		this.doc.getRoot()
			.listMaterials()
			.forEach((material) => {
				const ior = material.getExtension<IOR>(NAME);
				if (ior) {
					const materialIndex = context.materialIndexMap.get(material);
					const materialDef = nativeDoc.json.materials[materialIndex];
					materialDef.extensions = materialDef.extensions || {};

					// Factors.

					materialDef.extensions[NAME] = {
						ior: ior.getIOR(),
					};
				}
			});

		return this;
	}
}
