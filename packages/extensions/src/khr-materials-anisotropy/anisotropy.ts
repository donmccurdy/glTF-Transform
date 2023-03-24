import {
	ExtensionProperty,
	IProperty,
	Nullable,
	PropertyType,
	Texture,
	TextureChannel,
	TextureInfo,
} from '@gltf-transform/core';
import { KHR_MATERIALS_ANISOTROPY } from '../constants.js';

interface IAnisotropy extends IProperty {
	anisotropyStrength: number;
	anisotropyRotation: number;
	anisotropyTexture: Texture;
	anisotropyTextureInfo: TextureInfo;
}

const { R, G } = TextureChannel;

/**
 * # Anisotropy
 *
 * Defines anisotropy (directionally-dependent reflections) on a PBR {@link Material}. See
 * {@link KHRMaterialsAnisotropy}.
 *
 * [[include:_UNRATIFIED_EXTENSIONS.md]]
 */
export class Anisotropy extends ExtensionProperty<IAnisotropy> {
	public static EXTENSION_NAME = KHR_MATERIALS_ANISOTROPY;
	public declare extensionName: typeof KHR_MATERIALS_ANISOTROPY;
	public declare propertyType: 'Anisotropy';
	public declare parentTypes: [PropertyType.MATERIAL];

	protected init(): void {
		this.extensionName = KHR_MATERIALS_ANISOTROPY;
		this.propertyType = 'Anisotropy';
		this.parentTypes = [PropertyType.MATERIAL];
	}

	protected getDefaults(): Nullable<IAnisotropy> {
		return Object.assign(super.getDefaults() as IProperty, {
			anisotropyStrength: 0.0,
			anisotropyRotation: 0.0,
			anisotropyTexture: null,
			anisotropyTextureInfo: new TextureInfo(this.graph, 'anisotropyTextureInfo'),
		});
	}

	/**********************************************************************************************
	 * Anisotropy strength.
	 */

	/** Anisotropy strength. */
	public getAnisotropyStrength(): number {
		return this.get('anisotropyStrength');
	}

	/** Anisotropy strength. */
	public setAnisotropyStrength(strength: number): this {
		return this.set('anisotropyStrength', strength);
	}

	/**********************************************************************************************
	 * Anisotropy rotation.
	 */

	/** Anisotropy rotation; linear multiplier. */
	public getAnisotropyRotation(): number {
		return this.get('anisotropyRotation');
	}

	/** Anisotropy rotation; linear multiplier. */
	public setAnisotropyRotation(rotation: number): this {
		return this.set('anisotropyRotation', rotation);
	}

	/**********************************************************************************************
	 * Anisotropy texture.
	 */

	/**
	 * Anisotropy texture. Red and green channels represent the anisotropy direction in [-1, 1]
	 * tangent, bitangent space. The vector is rotated by anisotropyRotation, and multiplied by
	 * anisotropyStrength, to obtain the final anisotropy direction and strength.
	 */
	public getAnisotropyTexture(): Texture | null {
		return this.getRef('anisotropyTexture');
	}

	/**
	 * Settings affecting the material's use of its anisotropy texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getAnisotropyTextureInfo(): TextureInfo | null {
		return this.getRef('anisotropyTexture') ? this.getRef('anisotropyTextureInfo') : null;
	}

	/** Anisotropy texture. See {@link getAnisotropyTexture}. */
	public setAnisotropyTexture(texture: Texture | null): this {
		return this.setRef('anisotropyTexture', texture, { channels: R | G });
	}
}
