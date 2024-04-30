import { Extension, GLTF, PropertyType, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_MATERIALS_IRIDESCENCE } from '../constants.js';
import { Iridescence } from './iridescence.js';

const NAME = KHR_MATERIALS_IRIDESCENCE;

interface IridescenceDef {
	iridescenceFactor: number;
	iridescenceTexture: GLTF.ITextureInfo;
	iridescenceIor: number;
	iridescenceThicknessMinimum: number;
	iridescenceThicknessMaximum: number;
	iridescenceThicknessTexture: GLTF.ITextureInfo;
}

/**
 * [`KHR_materials_iridescence`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_iridescence/)
 * defines iridescence (thin film interference) on a PBR material.
 *
 * ![Illustration](/media/extensions/khr-materials-iridescence.png)
 *
 * > _**Figure:** Varying levels of iridescence IOR values.
 * > Source: [Khronos Group](https://github.com/KhronosGroup/gltf/tree/main/extensions/2.0/Khronos/KHR_materials_iridescence)._
 *
 * Iridescence describes an effect where hue varies depending on the viewing
 * angle and illumination angle: A thin-film of a semi-transparent layer
 * results in inter-reflections and due to thin-film interference, certain
 * wavelengths get absorbed or amplified. Iridescence can be seen on soap
 * bubbles, oil films, or on the wings of many insects. With this extension,
 * thickness and index of refraction (IOR) of the thin-film can be specified,
 * enabling iridescent materials.
 *
 * Properties:
 * - {@link Iridescence}
 *
 * ### Example
 *
 * The `KHRMaterialsIridescence` class provides a single {@link ExtensionProperty} type, `Iridescence`,
 * which may be attached to any {@link Material} instance. For example:
 *
 * ```typescript
 * import { KHRMaterialsIridescence, Iridescence } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const iridescenceExtension = document.createExtension(KHRMaterialsIridescence);
 *
 * // Create an Iridescence property.
 * const iridescence = iridescenceExtension.createIridescence()
 * 	.setIridescenceFactor(1.0)
 * 	.setIridescenceIOR(1.8);
 *
 * // Attach the property to a Material.
 * material.setExtension('KHR_materials_iridescence', iridescence);
 * ```
 */
export class KHRMaterialsIridescence extends Extension {
	public static readonly EXTENSION_NAME = NAME;
	public readonly extensionName = NAME;
	public readonly prereadTypes = [PropertyType.MESH];
	public readonly prewriteTypes = [PropertyType.MESH];

	/** Creates a new Iridescence property for use on a {@link Material}. */
	public createIridescence(): Iridescence {
		return new Iridescence(this.document.getGraph());
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
		const textureDefs = jsonDoc.json.textures || [];
		materialDefs.forEach((materialDef, materialIndex) => {
			if (materialDef.extensions && materialDef.extensions[NAME]) {
				const iridescence = this.createIridescence();
				context.materials[materialIndex].setExtension(NAME, iridescence);

				const iridescenceDef = materialDef.extensions[NAME] as IridescenceDef;

				// Factors.

				if (iridescenceDef.iridescenceFactor !== undefined) {
					iridescence.setIridescenceFactor(iridescenceDef.iridescenceFactor);
				}
				if (iridescenceDef.iridescenceIor !== undefined) {
					iridescence.setIridescenceIOR(iridescenceDef.iridescenceIor);
				}
				if (iridescenceDef.iridescenceThicknessMinimum !== undefined) {
					iridescence.setIridescenceThicknessMinimum(iridescenceDef.iridescenceThicknessMinimum);
				}
				if (iridescenceDef.iridescenceThicknessMaximum !== undefined) {
					iridescence.setIridescenceThicknessMaximum(iridescenceDef.iridescenceThicknessMaximum);
				}

				// Textures.

				if (iridescenceDef.iridescenceTexture !== undefined) {
					const textureInfoDef = iridescenceDef.iridescenceTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source!];
					iridescence.setIridescenceTexture(texture);
					context.setTextureInfo(iridescence.getIridescenceTextureInfo()!, textureInfoDef);
				}
				if (iridescenceDef.iridescenceThicknessTexture !== undefined) {
					const textureInfoDef = iridescenceDef.iridescenceThicknessTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source!];
					iridescence.setIridescenceThicknessTexture(texture);
					context.setTextureInfo(iridescence.getIridescenceThicknessTextureInfo()!, textureInfoDef);
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
				const iridescence = material.getExtension<Iridescence>(NAME);
				if (iridescence) {
					const materialIndex = context.materialIndexMap.get(material)!;
					const materialDef = jsonDoc.json.materials![materialIndex];
					materialDef.extensions = materialDef.extensions || {};

					// Factors.

					const iridescenceDef = (materialDef.extensions[NAME] = {} as IridescenceDef);

					if (iridescence.getIridescenceFactor() > 0) {
						iridescenceDef.iridescenceFactor = iridescence.getIridescenceFactor();
					}
					if (iridescence.getIridescenceIOR() !== 1.3) {
						iridescenceDef.iridescenceIor = iridescence.getIridescenceIOR();
					}
					if (iridescence.getIridescenceThicknessMinimum() !== 100) {
						iridescenceDef.iridescenceThicknessMinimum = iridescence.getIridescenceThicknessMinimum();
					}
					if (iridescence.getIridescenceThicknessMaximum() !== 400) {
						iridescenceDef.iridescenceThicknessMaximum = iridescence.getIridescenceThicknessMaximum();
					}

					// Textures.

					if (iridescence.getIridescenceTexture()) {
						const texture = iridescence.getIridescenceTexture()!;
						const textureInfo = iridescence.getIridescenceTextureInfo()!;
						iridescenceDef.iridescenceTexture = context.createTextureInfoDef(texture, textureInfo);
					}
					if (iridescence.getIridescenceThicknessTexture()) {
						const texture = iridescence.getIridescenceThicknessTexture()!;
						const textureInfo = iridescence.getIridescenceThicknessTextureInfo()!;
						iridescenceDef.iridescenceThicknessTexture = context.createTextureInfoDef(texture, textureInfo);
					}
				}
			});

		return this;
	}
}
