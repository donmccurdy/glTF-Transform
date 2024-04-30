import { Extension, GLTF, PropertyType, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_MATERIALS_ANISOTROPY } from '../constants.js';
import { Anisotropy } from './anisotropy.js';

const NAME = KHR_MATERIALS_ANISOTROPY;

interface AnisotropyDef {
	anisotropyStrength: number;
	anisotropyRotation: number;
	anisotropyTexture: GLTF.ITextureInfo;
}

/**
 * [`KHR_materials_anisotropy`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_anisotropy/)
 * defines anisotropy (directionally-dependent reflections) on a PBR material.
 *
 * ![Illustration](/media/extensions/khr-materials-anisotropy.jpg)
 *
 * > _**Figure:** Effect of each color channel in the anisotropyTexture. Left
 * > to right: the full anisotropy texture, filling the red channel with black,
 * > filling the green channel with black, filling the blue channel with black.
 * > Source: [Khronos Group & Wayfair](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/AnisotropyBarnLamp)._
 *
 * This extension defines the anisotropic property of a material as observable with brushed metals
 * for instance. An asymmetric specular lobe model is introduced to allow for such phenomena. The
 * visually distinct feature of that lobe is the elongated appearance of the specular reflection.
 * For a single punctual light source, the specular reflection will eventually degenerate into a
 * zero width line in the limit, that is where the material is fully anisotropic, as opposed to be
 * fully isotropic in which case the specular reflection is radially symmetric.
 *
 * Properties:
 * - {@link Anisotropy}
 *
 * ### Example
 *
 * The `KHRMaterialsAnisotropy` class provides a single {@link ExtensionProperty} type, `Anisotropy`,
 * which may be attached to any {@link Material} instance. For example:
 *
 * ```typescript
 * import { KHRMaterialsAnisotropy, Anisotropy } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const anisotropyExtension = document.createExtension(KHRMaterialsAnisotropy);
 *
 * // Create an Anisotropy property.
 * const anisotropy = anisotropyExtension.createAnisotropy()
 * 	.setAnisotropyStrength(1.0)
 * 	.setAnisotropyRotation(Math.PI / 4);
 *
 * // Attach the property to a Material.
 * material.setExtension('KHR_materials_anisotropy', anisotropy);
 * ```
 */
export class KHRMaterialsAnisotropy extends Extension {
	public static readonly EXTENSION_NAME = NAME;
	public readonly extensionName = NAME;
	public readonly prereadTypes = [PropertyType.MESH];
	public readonly prewriteTypes = [PropertyType.MESH];

	/** Creates a new Anisotropy property for use on a {@link Material}. */
	public createAnisotropy(): Anisotropy {
		return new Anisotropy(this.document.getGraph());
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
				const anisotropy = this.createAnisotropy();
				context.materials[materialIndex].setExtension(NAME, anisotropy);

				const anisotropyDef = materialDef.extensions[NAME] as AnisotropyDef;

				// Factors.

				if (anisotropyDef.anisotropyStrength !== undefined) {
					anisotropy.setAnisotropyStrength(anisotropyDef.anisotropyStrength);
				}
				if (anisotropyDef.anisotropyRotation !== undefined) {
					anisotropy.setAnisotropyRotation(anisotropyDef.anisotropyRotation);
				}

				// Textures.

				if (anisotropyDef.anisotropyTexture !== undefined) {
					const textureInfoDef = anisotropyDef.anisotropyTexture;
					const texture = context.textures[textureDefs[textureInfoDef.index].source!];
					anisotropy.setAnisotropyTexture(texture);
					context.setTextureInfo(anisotropy.getAnisotropyTextureInfo()!, textureInfoDef);
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
				const anisotropy = material.getExtension<Anisotropy>(NAME);
				if (anisotropy) {
					const materialIndex = context.materialIndexMap.get(material)!;
					const materialDef = jsonDoc.json.materials![materialIndex];
					materialDef.extensions = materialDef.extensions || {};

					// Factors.

					const anisotropyDef = (materialDef.extensions[NAME] = {} as AnisotropyDef);

					if (anisotropy.getAnisotropyStrength() > 0) {
						anisotropyDef.anisotropyStrength = anisotropy.getAnisotropyStrength();
					}
					if (anisotropy.getAnisotropyRotation() !== 0) {
						anisotropyDef.anisotropyRotation = anisotropy.getAnisotropyRotation();
					}

					// Textures.

					if (anisotropy.getAnisotropyTexture()) {
						const texture = anisotropy.getAnisotropyTexture()!;
						const textureInfo = anisotropy.getAnisotropyTextureInfo()!;
						anisotropyDef.anisotropyTexture = context.createTextureInfoDef(texture, textureInfo);
					}
				}
			});

		return this;
	}
}
