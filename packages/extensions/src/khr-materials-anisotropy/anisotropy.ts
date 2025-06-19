import {
	ExtensionProperty,
	type IProperty,
	type Nullable,
	PropertyType,
	type Texture,
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

const { R, G, B } = TextureChannel;

/**
 * Defines anisotropy (directionally-dependent reflections) on a PBR {@link Material}. See
 * {@link KHRMaterialsAnisotropy}.
 */
export class Anisotropy extends ExtensionProperty<IAnisotropy> {
	public static EXTENSION_NAME: typeof KHR_MATERIALS_ANISOTROPY = KHR_MATERIALS_ANISOTROPY;
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
	 * Anisotropy texture. Red and green channels represent the anisotropy
	 * direction in [-1, 1] tangent, bitangent space, to be rotated by
	 * anisotropyRotation. The blue channel contains strength as [0, 1] to be
	 * multiplied by anisotropyStrength.
	 */
	public getAnisotropyTexture(): Texture | null {
		return this.getRef('anisotropyTexture');
	}

	/**
	 * Settings affecting the material's use of its anisotropy texture. If no
	 * texture is attached, {@link TextureInfo} is `null`.
	 */
	public getAnisotropyTextureInfo(): TextureInfo | null {
		return this.getRef('anisotropyTexture') ? this.getRef('anisotropyTextureInfo') : null;
	}

	/** Anisotropy texture. See {@link Anisotropy.getAnisotropyTexture getAnisotropyTexture}. */
	public setAnisotropyTexture(texture: Texture | null): this {
		return this.setRef('anisotropyTexture', texture, { channels: R | G | B });
	}
}
