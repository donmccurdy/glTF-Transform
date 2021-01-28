import { COPY_IDENTITY, ExtensionProperty, GraphChild, Link, PropertyType, Texture, TextureInfo } from '@gltf-transform/core';
import { KHR_MATERIALS_TRANSMISSION } from '../constants';

/** Documentation in {@link EXTENSIONS.md}. */
export class Transmission extends ExtensionProperty {
	public readonly propertyType = 'Transmission';
	public readonly parentTypes = [PropertyType.MATERIAL];
	public readonly extensionName = KHR_MATERIALS_TRANSMISSION;
	public static EXTENSION_NAME = KHR_MATERIALS_TRANSMISSION;

	private _transmissionFactor = 0.0;

	@GraphChild private transmissionTexture: Link<this, Texture> | null = null;
	@GraphChild private transmissionTextureInfo: Link<this, TextureInfo> =
		this.graph.link('transmissionTextureInfo', this, new TextureInfo(this.graph));

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this._transmissionFactor = other._transmissionFactor;

		if (other.transmissionTexture) {
			this.setTransmissionTexture(resolve(other.transmissionTexture.getChild()));
			this.getTransmissionTextureInfo()
				.copy(resolve(other.transmissionTextureInfo.getChild()), resolve);
		}

		return this;
	}

	public dispose(): void {
		this.transmissionTextureInfo.getChild().dispose();
		super.dispose();
	}

	/**********************************************************************************************
	 * Transmission.
	 */

	/** Transmission; linear multiplier. See {@link getTransmissionTexture}. */
	public getTransmissionFactor(): number { return this._transmissionFactor; }

	/** Transmission; linear multiplier. See {@link getTransmissionTexture}. */
	public setTransmissionFactor(transmissionFactor: number): this {
		this._transmissionFactor = transmissionFactor;
		return this;
	}

	/**
	 * Transmission texture; linear multiplier. The `r` channel of this texture specifies
	 * transmission [0-1] of the material's surface. By default this is a thin transparency
	 * effect, but volume effects (refraction, subsurface scattering) may be introduced with the
	 * addition of the `KHR_materials_volume` extension.
	 */
	public getTransmissionTexture(): Texture | null {
		return this.transmissionTexture ? this.transmissionTexture.getChild() : null;
	}

	/**
	 * Settings affecting the material's use of its transmission texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getTransmissionTextureInfo(): TextureInfo | null {
		return this.transmissionTexture ? this.transmissionTextureInfo.getChild() : null;
	}

	/** Sets transmission texture. See {@link getTransmissionTexture}. */
	public setTransmissionTexture(texture: Texture | null): this {
		this.transmissionTexture = this.graph.link('transmissionTexture', this, texture);
		return this;
	}
}
