import { Extension, PropertyType, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_MATERIALS_DISPERSION } from '../constants.js';
import { Dispersion } from './dispersion.js';

const NAME = KHR_MATERIALS_DISPERSION;

interface DispersionDef {
	dispersion?: number;
}

/**
 * [KHR_materials_dispersion](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_dispersion/)
 * defines dispersion on a glTF PBR material.
 *
 * ![illustration](/media/extensions/khr-materials-dispersion.jpg)
 *
 * > _**Figure:** Prisms demonstrating volumetric refraction and dispersion, for varying
 * > values of dispersion and IOR. Source: Khronos Group, rendered in Adobe Stager._
 *
 * Dispersion enables configuring the strength of the angular separation of colors (chromatic
 * aberration) transmitting through a relatively clear volume.  It is an enhancement to the
 * default `KHR_materials_volume` transmission model which assumes no dispersion.
 *
 * Properties:
 * - {@link Dispersion}
 *
 * ### Example
 *
 * ```typescript
 * import { KHRMaterialsDispersion, Dispersion } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const dispersionExtension = document.createExtension(KHRMaterialsDispersion);
 *
 * // Create Dispersion property.
 * const dispersion = dispersionExtension.createDispersion().setDispersion(1.0);
 *
 * // Assign to a Material.
 * material.setExtension('KHR_materials_dispersion', dispersion);
 * ```
 */
export class KHRMaterialsDispersion extends Extension {
	public static readonly EXTENSION_NAME = NAME;
	public readonly extensionName = NAME;
	public readonly prereadTypes = [PropertyType.MESH];
	public readonly prewriteTypes = [PropertyType.MESH];

	/** Creates a new Dispersion property for use on a {@link Material}. */
	public createDispersion(): Dispersion {
		return new Dispersion(this.document.getGraph());
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
				const dispersion = this.createDispersion();
				context.materials[materialIndex].setExtension(NAME, dispersion);

				const dispersionDef = materialDef.extensions[NAME] as DispersionDef;

				// Factors.

				if (dispersionDef.dispersion !== undefined) {
					dispersion.setDispersion(dispersionDef.dispersion);
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
				const dispersion = material.getExtension<Dispersion>(NAME);
				if (dispersion) {
					const materialIndex = context.materialIndexMap.get(material)!;
					const materialDef = jsonDoc.json.materials![materialIndex];
					materialDef.extensions = materialDef.extensions || {};

					// Factors.

					materialDef.extensions[NAME] = {
						dispersion: dispersion.getDispersion(),
					};
				}
			});

		return this;
	}
}
