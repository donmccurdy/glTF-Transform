import { COPY_IDENTITY, ColorUtils, ExtensionProperty, GraphChild, Link, PropertyType, Texture, TextureChannel, TextureInfo, TextureLink, vec3 } from '@gltf-transform/core';
import { KHR_MATERIALS_VOLUME } from '../constants';

const { G } = TextureChannel;

/**
 * # Volume
 *
 * Defines volume on a PBR {@link Material}. See {@link MaterialsVolume}.
 */
export class Volume extends ExtensionProperty {
	public readonly propertyType = 'Transmission';
	public readonly parentTypes = [PropertyType.MATERIAL];
	public readonly extensionName = KHR_MATERIALS_VOLUME;
	public static EXTENSION_NAME = KHR_MATERIALS_VOLUME;

	private _thicknessFactor = 0.0;
	private _attenuationDistance = Infinity;
	private _attenuationColor = [1, 1, 1] as vec3;

	@GraphChild private thicknessTexture: TextureLink | null = null;
	@GraphChild private thicknessTextureInfo: Link<this, TextureInfo> =
		this.graph.link('thicknessTextureInfo', this, new TextureInfo(this.graph));

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this._thicknessFactor = other._thicknessFactor;
		this._attenuationDistance = other._attenuationDistance;
		this._attenuationColor = [...other._attenuationColor] as vec3;

		this.setThicknessTexture(
			other.thicknessTexture
				? resolve(other.thicknessTexture.getChild())
				: null
		);
		this.thicknessTextureInfo.getChild()
			.copy(resolve(other.thicknessTextureInfo.getChild()), resolve);

		return this;
	}

	public dispose(): void {
		this.thicknessTextureInfo.getChild().dispose();
		super.dispose();
	}

	/**********************************************************************************************
	 * Thickness.
	 */

	/**
	 * Thickness of the volume beneath the surface in meters in the local coordinate system of the
	 * node. If the value is 0 the material is thin-walled. Otherwise the material is a volume
	 * boundary. The doubleSided property has no effect on volume boundaries.
	 */
	public getThicknessFactor(): number { return this._thicknessFactor; }

	/**
	 * Thickness of the volume beneath the surface in meters in the local coordinate system of the
	 * node. If the value is 0 the material is thin-walled. Otherwise the material is a volume
	 * boundary. The doubleSided property has no effect on volume boundaries.
	 */
	public setThicknessFactor(thicknessFactor: number): this {
		this._thicknessFactor = thicknessFactor;
		return this;
	}

	/**
	 * Texture that defines the thickness, stored in the G channel. This will be multiplied by
	 * thicknessFactor.
	 */
	public getThicknessTexture(): Texture | null {
		return this.thicknessTexture ? this.thicknessTexture.getChild() : null;
	}

	/**
	 * Settings affecting the material's use of its thickness texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getThicknessTextureInfo(): TextureInfo | null {
		return this.thicknessTexture ? this.thicknessTextureInfo.getChild() : null;
	}

	/**
	 * Texture that defines the thickness, stored in the G channel. This will be multiplied by
	 * thicknessFactor.
	 */
	public setThicknessTexture(texture: Texture | null): this {
		this.thicknessTexture = this.graph.linkTexture('thicknessTexture', G, this, texture);
		return this;
	}

	/**********************************************************************************************
	 * Attenuation.
	 */

	/**
	 * Density of the medium given as the average distance in meters that light travels in the
	 * medium before interacting with a particle.
	 */
	public getAttenuationDistance(): number {
		return this._attenuationDistance;
	}

	/**
	 * Density of the medium given as the average distance in meters that light travels in the
	 * medium before interacting with a particle.
	 */
	public setAttenuationDistance(attenuationDistance: number): this {
		this._attenuationDistance = attenuationDistance;
		return this;
	}

	/**
	 * Color (linear) that white light turns into due to absorption when reaching the attenuation
	 * distance.
	 */
	public getAttenuationColor(): vec3 {
		return this._attenuationColor;
	}

	/**
	 * Color (linear) that white light turns into due to absorption when reaching the attenuation
	 * distance.
	 */
	public setAttenuationColor(attenuationColor: vec3): this {
		this._attenuationColor = attenuationColor;
		return this;
	}

	/**
	 * Color (sRGB) that white light turns into due to absorption when reaching the attenuation
	 * distance.
	 */
	public getAttenuationColorHex(): number {
		return ColorUtils.factorToHex(this._attenuationColor);
	}

	/**
	 * Color (sRGB) that white light turns into due to absorption when reaching the attenuation
	 * distance.
	 */
	public setAttenuationColorHex(hex: number): this {
		ColorUtils.hexToFactor(hex, this._attenuationColor);
		return this;
	}
}
