import { Extension, GLTF, ReaderContext, WriterContext, vec3 } from '@gltf-transform/core';
import { KHR_MATERIALS_SHEEN } from '../constants.js';
import { Sheen } from './sheen.js';

const NAME = KHR_MATERIALS_SHEEN;

interface SheenDef {
	sheenColorFactor?: vec3;
	sheenRoughnessFactor?: number;
	sheenColorTexture?: GLTF.ITextureInfo;
	sheenRoughnessTexture?: GLTF.ITextureInfo;
}

/**
 * [`KHR_materials_sheen`](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_sheen/)
 * defines a velvet-like sheen layered on a glTF PBR material.
 *
 * ![Illustration](/media/extensions/khr-materials-sheen.png)
 *
 * > _**Figure:** A cushion, showing high material roughness and low sheen roughness. Soft
 * > highlights at edges of the material show backscattering from microfibers. Source: Khronos
 * > Group._
 *
 * A sheen layer is a common technique used in Physically-Based Rendering to represent
 * cloth and fabric materials.
 *
 * Properties:
 * - {@link Sheen}
 *
 * ### Example
 *
 * The `KHRMaterialsSheen` class provides a single {@link ExtensionProperty} type, `Sheen`,
 * which may be attached to any {@link Material} instance. For example:
 *
 * ```typescript
 * import { KHRMaterialsSheen, Sheen } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const sheenExtension = document.createExtension(KHRMaterialsSheen);
 *
 * // Create a Sheen property.
 * const sheen = sheenExtension.createSheen()
 * 	.setSheenColorFactor([1.0, 1.0, 1.0]);
 *
 * // Attach the property to a Material.
 * material.setExtension('KHR_materials_sheen', sheen);
 * ```
 */
export class KHRMaterialsSheen extends Extension {
	public readonly extensionName = NAME;
	public static readonly EXTENSION_NAME = NAME;

	/** Creates a new Sheen property for use on a {@link Material}. */
	public createSheen(): Sheen {
		return new Sheen(this.document.getGraph());
	}

	/** @hidden */
	public read(context: ReaderContext): this {
		const jsonDoc = context.jsonDoc;
		const materialDefs = jsonDoc.json.materials || [];
		const textureDefs = jsonDoc.json.textures || [];
		materialDefs.forEach((materialDef, materialIndex) => {
			if (materialDef.extensions && materialDef.extensions[NAME]) {
				const sheen = this.createSheen();
				context.materials[materialIndex].setExtension(NAME, sheen);

				const sheenDef = materialDef.extensions[NAME] as SheenDef;

				// Factors.

				if (sheenDef.sheenColorFactor !== undefined) {
					sheen.setSheenColorFactor(sheenDef.sheenColorFactor);
				}
				if (sheenDef.sheenRoughnessFactor !== undefined) {
					sheen.setSheenRoughnessFactor(sheenDef.sheenRoughnessFactor);
				}

				// Textures.

				if (sheenDef.sheenColorTexture !== undefined) {
					const textureInfoDef = sheenDef.sheenColorTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source!];
					sheen.setSheenColorTexture(texture);
					context.setTextureInfo(sheen.getSheenColorTextureInfo()!, textureInfoDef);
				}
				if (sheenDef.sheenRoughnessTexture !== undefined) {
					const textureInfoDef = sheenDef.sheenRoughnessTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source!];
					sheen.setSheenRoughnessTexture(texture);
					context.setTextureInfo(sheen.getSheenRoughnessTextureInfo()!, textureInfoDef);
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
				const sheen = material.getExtension<Sheen>(NAME);
				if (sheen) {
					const materialIndex = context.materialIndexMap.get(material)!;
					const materialDef = jsonDoc.json.materials![materialIndex];
					materialDef.extensions = materialDef.extensions || {};

					// Factors.

					const sheenDef = (materialDef.extensions[NAME] = {
						sheenColorFactor: sheen.getSheenColorFactor(),
						sheenRoughnessFactor: sheen.getSheenRoughnessFactor(),
					} as SheenDef);

					// Textures.

					if (sheen.getSheenColorTexture()) {
						const texture = sheen.getSheenColorTexture()!;
						const textureInfo = sheen.getSheenColorTextureInfo()!;
						sheenDef.sheenColorTexture = context.createTextureInfoDef(texture, textureInfo);
					}
					if (sheen.getSheenRoughnessTexture()) {
						const texture = sheen.getSheenRoughnessTexture()!;
						const textureInfo = sheen.getSheenRoughnessTextureInfo()!;
						sheenDef.sheenRoughnessTexture = context.createTextureInfoDef(texture, textureInfo);
					}
				}
			});

		return this;
	}
}
