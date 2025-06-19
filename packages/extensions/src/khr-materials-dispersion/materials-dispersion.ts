import { Extension, PropertyType, type ReaderContext, type WriterContext } from '@gltf-transform/core';
import { KHR_MATERIALS_DISPERSION } from '../constants.js';
import { Dispersion } from './dispersion.js';

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
	public static readonly EXTENSION_NAME: typeof KHR_MATERIALS_DISPERSION = KHR_MATERIALS_DISPERSION;
	public readonly extensionName: typeof KHR_MATERIALS_DISPERSION = KHR_MATERIALS_DISPERSION;
	public readonly prereadTypes: PropertyType[] = [PropertyType.MESH];
	public readonly prewriteTypes: PropertyType[] = [PropertyType.MESH];

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
			if (materialDef.extensions && materialDef.extensions[KHR_MATERIALS_DISPERSION]) {
				const dispersion = this.createDispersion();
				context.materials[materialIndex].setExtension(KHR_MATERIALS_DISPERSION, dispersion);

				const dispersionDef = materialDef.extensions[KHR_MATERIALS_DISPERSION] as DispersionDef;

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
				const dispersion = material.getExtension<Dispersion>(KHR_MATERIALS_DISPERSION);
				if (dispersion) {
					const materialIndex = context.materialIndexMap.get(material)!;
					const materialDef = jsonDoc.json.materials![materialIndex];
					materialDef.extensions = materialDef.extensions || {};

					// Factors.

					materialDef.extensions[KHR_MATERIALS_DISPERSION] = {
						dispersion: dispersion.getDispersion(),
					};
				}
			});

		return this;
	}
}
