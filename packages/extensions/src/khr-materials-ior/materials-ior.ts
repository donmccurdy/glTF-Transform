import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_MATERIALS_IOR } from '../constants';
import { IOR } from './ior';

const NAME = KHR_MATERIALS_IOR;

interface IORDef {
	ior?: number;
}

/**
 * # MaterialsIOR
 *
 * [KHR_materials_ior](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_materials_ior/)
 * defines index of refraction on a glTF PBR material.
 *
 * The dielectric BRDF of the metallic-roughness material in glTF uses a fixed value of 1.5 for the
 * index of refraction. This is a good fit for many plastics and glass, but not for other materials
 * like water or asphalt, sapphire or diamond. `KHR_materials_ior` allows users to set the index of
 * refraction to a certain value.
 *
 * Properties:
 * - {@link IOR}
 *
 * ### Example
 *
 * ```typescript
 * import { MaterialsIOR, IOR } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const iorExtension = document.createExtension(MaterialsIOR);
 *
 * // Create IOR property.
 * const ior = iorExtension.createIOR().setIOR(1.0);
 *
 * // Assign to a Material.
 * material.setExtension('KHR_materials_ior', ior);
 * ```
 */
export class MaterialsIOR extends Extension {
	public readonly extensionName = NAME;
	public static readonly EXTENSION_NAME = NAME;

	public createIOR(): IOR {
		return new IOR(this.doc.getGraph(), this);
	}

	public read(context: ReaderContext): this {
		const jsonDoc = context.jsonDoc;
		const materialDefs = jsonDoc.json.materials || [];
		materialDefs.forEach((materialDef, materialIndex) => {
			if (materialDef.extensions && materialDef.extensions[NAME]) {
				const ior = this.createIOR();
				context.materials[materialIndex].setExtension(NAME, ior);

				const iorDef = materialDef.extensions[NAME] as IORDef;

				// Factors.

				if (iorDef.ior !== undefined) {
					ior.setIOR(iorDef.ior);
				}
			}
		});

		return this;
	}

	public write(context: WriterContext): this {
		const jsonDoc = context.jsonDoc;

		this.doc.getRoot()
			.listMaterials()
			.forEach((material) => {
				const ior = material.getExtension<IOR>(NAME);
				if (ior) {
					const materialIndex = context.materialIndexMap.get(material)!;
					const materialDef = jsonDoc.json.materials![materialIndex];
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
