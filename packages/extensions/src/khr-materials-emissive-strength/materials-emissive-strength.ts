import { Extension, PropertyType, type ReaderContext, type WriterContext } from '@gltf-transform/core';
import { KHR_MATERIALS_EMISSIVE_STRENGTH } from '../constants.js';
import { EmissiveStrength } from './emissive-strength.js';

interface EmissiveStrengthDef {
	emissiveStrength?: number;
}

/**
 * [KHR_materials_emissive_strength](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_emissive_strength/)
 * defines emissive strength and enables high-dynamic-range (HDR) emissive materials.
 *
 * ![Illustration](/media/extensions/khr-materials-emissive-strength.jpg)
 *
 * > _**Figure:** Cubes with emissive color #59BCF3 and emissive strength
 * > increasing from 1 to 256 nits, left to right. Rendered in [three.js](https://threejs.org/),
 * > with independent point lighting and a bloom effect.
 * > Source: [Don McCurdy](https://www.donmccurdy.com/2024/04/27/emission-and-bloom/)._
 *
 * The core glTF 2.0 material model includes {@link Material.setEmissiveFactor `emissiveFactor`}
 * and {@link Material.setEmissiveTexture `emissiveTexture`} to control the color and intensity
 * of the light being emitted by the material, clamped to the range [0.0, 1.0]. However, in
 * PBR environments with HDR reflections and lighting, stronger emission effects may be desirable.
 *
 * In this extension, a new {@link EmissiveStrength.setEmissiveStrength `emissiveStrength`} scalar
 * factor is supplied, which governs the upper limit of emissive strength per material and may be
 * given arbitrarily high values.
 *
 * For implementations where a physical light unit is needed, the units for the multiplicative
 * product of the emissive texture and factor are candela per square meter (cd / m2), sometimes
 * called _nits_. Many realtime rendering engines simplify this calculation by assuming that an
 * emissive factor of 1.0 results in a fully exposed pixel.
 *
 * Properties:
 * - {@link EmissiveStrength}
 *
 * ### Example
 *
 * ```typescript
 * import { KHRMaterialsEmissiveStrength, EmissiveStrength } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const emissiveStrengthExtension = document.createExtension(KHRMaterialsEmissiveStrength);
 *
 * // Create EmissiveStrength property.
 * const emissiveStrength = emissiveStrengthExtension
 * 	.createEmissiveStrength().setEmissiveStrength(5.0);
 *
 * // Assign to a Material.
 * material.setExtension('KHR_materials_emissive_strength', emissiveStrength);
 * ```
 */
export class KHRMaterialsEmissiveStrength extends Extension {
	public static readonly EXTENSION_NAME: typeof KHR_MATERIALS_EMISSIVE_STRENGTH = KHR_MATERIALS_EMISSIVE_STRENGTH;
	public readonly extensionName: typeof KHR_MATERIALS_EMISSIVE_STRENGTH = KHR_MATERIALS_EMISSIVE_STRENGTH;
	public readonly prereadTypes: PropertyType[] = [PropertyType.MESH];
	public readonly prewriteTypes: PropertyType[] = [PropertyType.MESH];

	/** Creates a new EmissiveStrength property for use on a {@link Material}. */
	public createEmissiveStrength(): EmissiveStrength {
		return new EmissiveStrength(this.document.getGraph());
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
			if (materialDef.extensions && materialDef.extensions[KHR_MATERIALS_EMISSIVE_STRENGTH]) {
				const emissiveStrength = this.createEmissiveStrength();
				context.materials[materialIndex].setExtension(KHR_MATERIALS_EMISSIVE_STRENGTH, emissiveStrength);

				const emissiveStrengthDef = materialDef.extensions[
					KHR_MATERIALS_EMISSIVE_STRENGTH
				] as EmissiveStrengthDef;

				// Factors.

				if (emissiveStrengthDef.emissiveStrength !== undefined) {
					emissiveStrength.setEmissiveStrength(emissiveStrengthDef.emissiveStrength);
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
				const emissiveStrength = material.getExtension<EmissiveStrength>(KHR_MATERIALS_EMISSIVE_STRENGTH);
				if (emissiveStrength) {
					const materialIndex = context.materialIndexMap.get(material)!;
					const materialDef = jsonDoc.json.materials![materialIndex];
					materialDef.extensions = materialDef.extensions || {};

					// Factors.

					materialDef.extensions[KHR_MATERIALS_EMISSIVE_STRENGTH] = {
						emissiveStrength: emissiveStrength.getEmissiveStrength(),
					} as EmissiveStrengthDef;
				}
			});

		return this;
	}
}
