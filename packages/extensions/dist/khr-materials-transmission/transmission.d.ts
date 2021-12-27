import { ExtensionProperty, IProperty, Nullable, PropertyType, Texture, TextureInfo } from '@gltf-transform/core';
import { KHR_MATERIALS_TRANSMISSION } from '../constants';
interface ITransmission extends IProperty {
    transmissionFactor: number;
    transmissionTexture: Texture;
    transmissionTextureInfo: TextureInfo;
}
/**
 * # Transmission
 *
 * Defines optical transmission on a PBR {@link Material}. See {@link MaterialsTransmission}.
 */
export declare class Transmission extends ExtensionProperty<ITransmission> {
    static EXTENSION_NAME: string;
    extensionName: typeof KHR_MATERIALS_TRANSMISSION;
    propertyType: 'Transmission';
    parentTypes: [PropertyType.MATERIAL];
    protected init(): void;
    protected getDefaults(): Nullable<ITransmission>;
    /**********************************************************************************************
     * Transmission.
     */
    /** Transmission; linear multiplier. See {@link getTransmissionTexture}. */
    getTransmissionFactor(): number;
    /** Transmission; linear multiplier. See {@link getTransmissionTexture}. */
    setTransmissionFactor(factor: number): this;
    /**
     * Transmission texture; linear multiplier. The `r` channel of this texture specifies
     * transmission [0-1] of the material's surface. By default this is a thin transparency
     * effect, but volume effects (refraction, subsurface scattering) may be introduced with the
     * addition of the `KHR_materials_volume` extension.
     */
    getTransmissionTexture(): Texture | null;
    /**
     * Settings affecting the material's use of its transmission texture. If no texture is attached,
     * {@link TextureInfo} is `null`.
     */
    getTransmissionTextureInfo(): TextureInfo | null;
    /** Sets transmission texture. See {@link getTransmissionTexture}. */
    setTransmissionTexture(texture: Texture | null): this;
}
export {};
