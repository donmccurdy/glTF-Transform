import { Extension, GLTF, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_MATERIALS_CLEARCOAT } from '../constants';
import { Clearcoat } from './clearcoat';

const NAME = KHR_MATERIALS_CLEARCOAT;

interface ClearcoatDef {
	clearcoatFactor?: number;
	clearcoatRoughnessFactor?: number;
	clearcoatTexture?: GLTF.ITextureInfo;
	clearcoatRoughnessTexture?: GLTF.ITextureInfo;
	clearcoatNormalTexture?: GLTF.IMaterialNormalTextureInfo;
}

/**
 * # MaterialsClearcoat
 *
 * [KHR_materials_clearcoat](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_materials_clearcoat/)
 * defines a clear coating on a glTF PBR material.
 *
 * ![Illustration](/media/extensions/khr-materials-clearcoat.png)
 *
 * > _**Figure:** Comparison of a carbon-fiber material without clearcoat (left) and with clearcoat
 * > (right). Source: [Filament](https://google.github.io/filament/Materials.html)._
 *
 * A clear coat is a common technique used in Physically-Based
 * Rendering for a protective layer applied to a base material.
 * Commonly used to represent car paint, carbon fiber, or thin lacquers.
 *
 * Properties:
 * - {@link Clearcoat}
 *
 * ### Example
 *
 * ```typescript
 * import { MaterialsClearcoat, Clearcoat } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const clearcoatExtension = document.createExtension(MaterialsClearcoat);
 *
 * // Create Clearcoat property.
 * const clearcoat = clearcoatExtension.createClearcoat()
 *	.setClearcoatFactor(1.0);
 *
 * // Assign to a Material.
 * material.setExtension('KHR_materials_clearcoat', clearcoat);
 * ```
 */
export class MaterialsClearcoat extends Extension {
	public readonly extensionName = NAME;
	public static readonly EXTENSION_NAME = NAME;

	public createClearcoat(): Clearcoat {
		return new Clearcoat(this.doc.getGraph(), this);
	}

	public read(context: ReaderContext): this {
		const jsonDoc = context.jsonDoc;
		const materialDefs = jsonDoc.json.materials || [];
		const textureDefs = jsonDoc.json.textures || [];
		materialDefs.forEach((materialDef, materialIndex) => {
			if (materialDef.extensions && materialDef.extensions[NAME]) {
				const clearcoat = this.createClearcoat();
				context.materials[materialIndex].setExtension(NAME, clearcoat);

				const clearcoatDef = materialDef.extensions[NAME] as ClearcoatDef;

				// Factors.

				if (clearcoatDef.clearcoatFactor !== undefined) {
					clearcoat.setClearcoatFactor(clearcoatDef.clearcoatFactor);
				}
				if (clearcoatDef.clearcoatRoughnessFactor !== undefined) {
					clearcoat.setClearcoatRoughnessFactor(
						clearcoatDef.clearcoatRoughnessFactor
					);
				}

				// Textures.

				if (clearcoatDef.clearcoatTexture !== undefined) {
					const textureInfoDef = clearcoatDef.clearcoatTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source!];
					clearcoat.setClearcoatTexture(texture);
					context.setTextureInfo(clearcoat.getClearcoatTextureInfo()!, textureInfoDef);
				}
				if (clearcoatDef.clearcoatRoughnessTexture !== undefined) {
					const textureInfoDef = clearcoatDef.clearcoatRoughnessTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source!];
					clearcoat.setClearcoatRoughnessTexture(texture);
					context.setTextureInfo(
						clearcoat.getClearcoatRoughnessTextureInfo()!,
						textureInfoDef
					);
				}
				if (clearcoatDef.clearcoatNormalTexture !== undefined) {
					const textureInfoDef = clearcoatDef.clearcoatNormalTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source!];
					clearcoat.setClearcoatNormalTexture(texture);
					context.setTextureInfo(
						clearcoat.getClearcoatNormalTextureInfo()!,
						textureInfoDef
					);
					if (textureInfoDef.scale !== undefined) {
						clearcoat.setClearcoatNormalScale(textureInfoDef.scale);
					}
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
				const clearcoat = material.getExtension<Clearcoat>(NAME);
				if (clearcoat) {
					const materialIndex = context.materialIndexMap.get(material)!;
					const materialDef = jsonDoc.json.materials![materialIndex];
					materialDef.extensions = materialDef.extensions || {};

					// Factors.

					const clearcoatDef = materialDef.extensions[NAME] = {
						clearcoatFactor: clearcoat.getClearcoatFactor(),
						clearcoatRoughnessFactor: clearcoat.getClearcoatRoughnessFactor(),
					} as ClearcoatDef;

					// Textures.

					if (clearcoat.getClearcoatTexture()) {
						const texture = clearcoat.getClearcoatTexture()!;
						const textureInfo = clearcoat.getClearcoatTextureInfo()!;
						clearcoatDef.clearcoatTexture
							= context.createTextureInfoDef(texture, textureInfo);
					}
					if (clearcoat.getClearcoatRoughnessTexture()) {
						const texture = clearcoat.getClearcoatRoughnessTexture()!;
						const textureInfo = clearcoat.getClearcoatRoughnessTextureInfo()!;
						clearcoatDef.clearcoatRoughnessTexture
							= context.createTextureInfoDef(texture, textureInfo);
					}
					if (clearcoat.getClearcoatNormalTexture()) {
						const texture = clearcoat.getClearcoatNormalTexture()!;
						const textureInfo = clearcoat.getClearcoatNormalTextureInfo()!;
						clearcoatDef.clearcoatNormalTexture
							= context.createTextureInfoDef(texture, textureInfo);
						if (clearcoat.getClearcoatNormalScale() !== 1) {
							clearcoatDef.clearcoatNormalTexture.scale
								= clearcoat.getClearcoatNormalScale();
						}
					}
				}
			});

		return this;
	}
}
