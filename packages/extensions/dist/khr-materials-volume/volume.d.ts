import { ExtensionProperty, IProperty, Nullable, PropertyType, Texture, TextureInfo, vec3 } from '@gltf-transform/core';
import { KHR_MATERIALS_VOLUME } from '../constants';
interface IVolume extends IProperty {
    thicknessFactor: number;
    thicknessTexture: Texture;
    thicknessTextureInfo: TextureInfo;
    attenuationDistance: number;
    attenuationColor: vec3;
}
/**
 * # Volume
 *
 * Defines volume on a PBR {@link Material}. See {@link MaterialsVolume}.
 */
export declare class Volume extends ExtensionProperty<IVolume> {
    static EXTENSION_NAME: string;
    extensionName: typeof KHR_MATERIALS_VOLUME;
    propertyType: 'Volume';
    parentTypes: [PropertyType.MATERIAL];
    protected init(): void;
    protected getDefaults(): Nullable<IVolume>;
    /**********************************************************************************************
     * Thickness.
     */
    /**
     * Thickness of the volume beneath the surface in meters in the local coordinate system of the
     * node. If the value is 0 the material is thin-walled. Otherwise the material is a volume
     * boundary. The doubleSided property has no effect on volume boundaries.
     */
    getThicknessFactor(): number;
    /**
     * Thickness of the volume beneath the surface in meters in the local coordinate system of the
     * node. If the value is 0 the material is thin-walled. Otherwise the material is a volume
     * boundary. The doubleSided property has no effect on volume boundaries.
     */
    setThicknessFactor(factor: number): this;
    /**
     * Texture that defines the thickness, stored in the G channel. This will be multiplied by
     * thicknessFactor.
     */
    getThicknessTexture(): Texture | null;
    /**
     * Settings affecting the material's use of its thickness texture. If no texture is attached,
     * {@link TextureInfo} is `null`.
     */
    getThicknessTextureInfo(): TextureInfo | null;
    /**
     * Texture that defines the thickness, stored in the G channel. This will be multiplied by
     * thicknessFactor.
     */
    setThicknessTexture(texture: Texture | null): this;
    /**********************************************************************************************
     * Attenuation.
     */
    /**
     * Density of the medium given as the average distance in meters that light travels in the
     * medium before interacting with a particle.
     */
    getAttenuationDistance(): number;
    /**
     * Density of the medium given as the average distance in meters that light travels in the
     * medium before interacting with a particle.
     */
    setAttenuationDistance(distance: number): this;
    /**
     * Color (linear) that white light turns into due to absorption when reaching the attenuation
     * distance.
     */
    getAttenuationColor(): vec3;
    /**
     * Color (linear) that white light turns into due to absorption when reaching the attenuation
     * distance.
     */
    setAttenuationColor(color: vec3): this;
    /**
     * Color (sRGB) that white light turns into due to absorption when reaching the attenuation
     * distance.
     */
    getAttenuationColorHex(): number;
    /**
     * Color (sRGB) that white light turns into due to absorption when reaching the attenuation
     * distance.
     */
    setAttenuationColorHex(hex: number): this;
}
export {};
