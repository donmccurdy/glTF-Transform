import { Extension, PropertyType, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_MATERIALS_IOR } from '../constants.js';
import { IOR } from './ior.js';

const NAME = KHR_MATERIALS_IOR;

interface IORDef {
	ior?: number;
}

/**
 * [KHR_materials_ior](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_ior/)
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
 * import { KHRMaterialsIOR, IOR } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const iorExtension = document.createExtension(KHRMaterialsIOR);
 *
 * // Create IOR property.
 * const ior = iorExtension.createIOR().setIOR(1.0);
 *
 * // Assign to a Material.
 * material.setExtension('KHR_materials_ior', ior);
 * ```
 */
export class KHRMaterialsIOR extends Extension {
	public static readonly EXTENSION_NAME = NAME;
	public readonly extensionName = NAME;
	public readonly prereadTypes = [PropertyType.MESH];
	public readonly prewriteTypes = [PropertyType.MESH];

	/** Creates a new IOR property for use on a {@link Material}. */
	public createIOR(): IOR {
		return new IOR(this.document.getGraph());
	}

	/** @hidden */
	public read(_context: ReaderContext): this {
		return this;
	}

	/** @hidden */
	public write(_context: WriterContext): this {
		return this;
	}

	/** @hidden */
	public preread(context: ReaderContext): this {
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

	/** @hidden */
	public prewrite(context: WriterContext): this {
		const jsonDoc = context.jsonDoc;

		this.document
			.getRoot()
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
