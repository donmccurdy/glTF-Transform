import {
	ExtensionProperty,
	IProperty,
	Nullable,
	PropertyType,
	Texture,
	TextureChannel,
	TextureInfo,
	vec2,
} from '@gltf-transform/core';
import { KHR_MATERIALS_ANISOTROPY } from '../constants.js';

interface IAnisotropy extends IProperty {
	anisotropyFactor: number;
	anisotropyDirection: vec2;
	anisotropyTexture: Texture;
	anisotropyTextureInfo: TextureInfo;
}

const { R, G } = TextureChannel;

/**
 * # Anisotropy
 *
 * Defines anisotropy (directionally-dependent reflections) on a PBR {@link Material}. See
 * {@link KHRMaterialsAnisotropy}.
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
			anisotropyFactor: 0.0,
			anisotropyDirection: [1, 0] as vec2,
			anisotropyTexture: null,
			anisotropyTextureInfo: new TextureInfo(this.graph, 'anisotropyTextureInfo'),
		});
	}

	/**********************************************************************************************
	 * Anisotropy.
	 */

	/** Anisotropy; linear multiplier. See {@link getAnisotropyTexture}. */
	public getAnisotropyFactor(): number {
		return this.get('anisotropyFactor');
	}

	/** Anisotropy; linear multiplier. See {@link getAnisotropyTexture}. */
	public setAnisotropyFactor(factor: number): this {
		return this.set('anisotropyFactor', factor);
	}

	/**
	 * Anisotropy texture. Red and green channels represent the anisotropy
	 * direction in [-1, 1] tangent, bitangent space. The magnitude of this
	 * vector is multiplied by anisotropyFactor to obtain the anisotropy
	 * strength.
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

	/**********************************************************************************************
	 * Anisotropy direction.
	 */

	/** Anisotropy direction; linear multiplier. */
	public getAnisotropyDirection(): vec2 {
		return this.get('anisotropyDirection');
	}

	/** Anisotropy direction; linear multiplier. */
	public setAnisotropyDirection(direction: vec2): this {
		return this.set('anisotropyDirection', direction);
	}
}
