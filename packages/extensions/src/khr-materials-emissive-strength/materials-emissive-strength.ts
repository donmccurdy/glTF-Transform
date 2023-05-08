import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_MATERIALS_EMISSIVE_STRENGTH } from '../constants.js';
import { EmissiveStrength } from './emissive-strength.js';

const NAME = KHR_MATERIALS_EMISSIVE_STRENGTH;

interface EmissiveStrengthDef {
	emissiveStrength?: number;
}

/**
 * [KHR_materials_emissive_strength](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_emissive_strength/)
 * defines emissive strength and enables high-dynamic-range (HDR) emissive materials.
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
	public readonly extensionName = NAME;
	public static readonly EXTENSION_NAME = NAME;

	/** Creates a new EmissiveStrength property for use on a {@link Material}. */
	public createEmissiveStrength(): EmissiveStrength {
		return new EmissiveStrength(this.document.getGraph());
	}

	/** @hidden */
	public read(context: ReaderContext): this {
		const jsonDoc = context.jsonDoc;
		const materialDefs = jsonDoc.json.materials || [];
		materialDefs.forEach((materialDef, materialIndex) => {
			if (materialDef.extensions && materialDef.extensions[NAME]) {
				const emissiveStrength = this.createEmissiveStrength();
				context.materials[materialIndex].setExtension(NAME, emissiveStrength);

				const emissiveStrengthDef = materialDef.extensions[NAME] as EmissiveStrengthDef;

				// Factors.

				if (emissiveStrengthDef.emissiveStrength !== undefined) {
					emissiveStrength.setEmissiveStrength(emissiveStrengthDef.emissiveStrength);
				}
			}
		});

		return this;
	}

	/** @hidden */
	public write(context: WriterContext): this {
		const jsonDoc = context.jsonDoc;

		this.document
			.getRoot()
			.listMaterials()
			.forEach((material) => {
				const emissiveStrength = material.getExtension<EmissiveStrength>(NAME);
				if (emissiveStrength) {
					const materialIndex = context.materialIndexMap.get(material)!;
					const materialDef = jsonDoc.json.materials![materialIndex];
					materialDef.extensions = materialDef.extensions || {};

					// Factors.

					materialDef.extensions[NAME] = {
						emissiveStrength: emissiveStrength.getEmissiveStrength(),
					} as EmissiveStrengthDef;
				}
			});

		return this;
	}
}
