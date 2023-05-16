import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_MATERIALS_UNLIT } from '../constants.js';
import { Unlit } from './unlit.js';

const NAME = KHR_MATERIALS_UNLIT;

/**
 * [`KHR_materials_unlit`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_unlit/)
 * defines an unlit shading model for use in glTF 2.0 materials.
 *
 * ![Illustration](/media/extensions/khr-materials-unlit.png)
 *
 * > _**Figure:** Unlit materials are useful for flat shading, stylized effects, and for improving
 * > performance on mobile devices. Source: [Model by Hayden VanEarden](https://sketchfab.com/3d-models/summertime-kirby-c5711316103a4d67a62c34cfe8710938)._
 *
 * Unlit (also "Shadeless" or "Constant") materials provide a simple alternative to the Physically
 * Based Rendering (PBR) shading models provided by the core specification. Unlit materials are
 * often useful for cheaper rendering on performance-contrained devices, e.g. mobile phones.
 * Additionally, unlit materials can be very useful in achieving stylized, non-photo-realistic
 * effects like hand painted illustrative styles or baked toon shaders.
 *
 * Properties:
 * - {@link Unlit}
 *
 * ### Example
 *
 * The `KHRMaterialsUnlit` class provides a single {@link ExtensionProperty} type, `Unlit`, which may
 * be attached to any {@link Material} instance. For example:
 *
 * ```typescript
 * import { KHRMaterialsUnlit, Unlit } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const unlitExtension = document.createExtension(KHRMaterialsUnlit);
 *
 * // Create an Unlit property.
 * const unlit = unlitExtension.createUnlit();
 *
 * // Attach the property to a Material.
 * material.setExtension('KHR_materials_unlit', unlit);
 * ```
 */
export class KHRMaterialsUnlit extends Extension {
	public readonly extensionName = NAME;
	public static readonly EXTENSION_NAME = NAME;

	/** Creates a new Unlit property for use on a {@link Material}. */
	public createUnlit(): Unlit {
		return new Unlit(this.document.getGraph());
	}

	/** @hidden */
	public read(context: ReaderContext): this {
		const materialDefs = context.jsonDoc.json.materials || [];
		materialDefs.forEach((materialDef, materialIndex) => {
			if (materialDef.extensions && materialDef.extensions[NAME]) {
				context.materials[materialIndex].setExtension(NAME, this.createUnlit());
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
				if (material.getExtension<Unlit>(NAME)) {
					const materialIndex = context.materialIndexMap.get(material)!;
					const materialDef = jsonDoc.json.materials![materialIndex];
					materialDef.extensions = materialDef.extensions || {};
					materialDef.extensions[NAME] = {};
				}
			});

		return this;
	}
}
