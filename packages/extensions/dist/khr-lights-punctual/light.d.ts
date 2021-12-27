import { ExtensionProperty, IProperty, Nullable, PropertyType, vec3 } from '@gltf-transform/core';
import { KHR_LIGHTS_PUNCTUAL } from '../constants';
interface ILight extends IProperty {
    color: vec3;
    intensity: number;
    type: PunctualLightType;
    range: number | null;
    innerConeAngle: number;
    outerConeAngle: number;
}
declare type PunctualLightType = 'point' | 'spot' | 'directional';
/**
 * # Light
 *
 * Defines a light attached to a {@link Node}. See {@link LightsPunctual}.
 */
export declare class Light extends ExtensionProperty<ILight> {
    static EXTENSION_NAME: string;
    extensionName: typeof KHR_LIGHTS_PUNCTUAL;
    propertyType: 'Light';
    parentTypes: [PropertyType.NODE];
    /**********************************************************************************************
     * CONSTANTS.
     */
    static Type: Record<string, PunctualLightType>;
    /**********************************************************************************************
     * INSTANCE.
     */
    protected init(): void;
    protected getDefaults(): Nullable<ILight>;
    /**********************************************************************************************
     * COLOR.
     */
    /** Components (R, G, B) of light's color in linear space. */
    getColor(): vec3;
    /** Components (R, G, B) of light's color in linear space. */
    setColor(color: vec3): this;
    /** Hex light color in sRGB colorspace. */
    getColorHex(): number;
    /** Hex light color in sRGB colorspace. */
    setColorHex(hex: number): this;
    /**********************************************************************************************
     * INTENSITY.
     */
    /**
     * Brightness of light. Units depend on the type of light: point and spot lights use luminous
     * intensity in candela (lm/sr) while directional lights use illuminance in lux (lm/m2).
     */
    getIntensity(): number;
    /**
     * Brightness of light. Units depend on the type of light: point and spot lights use luminous
     * intensity in candela (lm/sr) while directional lights use illuminance in lux (lm/m2).
     */
    setIntensity(intensity: number): this;
    /**********************************************************************************************
     * TYPE.
     */
    /** Type. */
    getType(): PunctualLightType;
    /** Type. */
    setType(type: PunctualLightType): this;
    /**********************************************************************************************
     * RANGE.
     */
    /**
     * Hint defining a distance cutoff at which the light's intensity may be considered to have
     * reached zero. Supported only for point and spot lights. Must be > 0. When undefined, range
     * is assumed to be infinite.
     */
    getRange(): number | null;
    /**
     * Hint defining a distance cutoff at which the light's intensity may be considered to have
     * reached zero. Supported only for point and spot lights. Must be > 0. When undefined, range
     * is assumed to be infinite.
     */
    setRange(range: number | null): this;
    /**********************************************************************************************
     * SPOT LIGHT PROPERTIES
     */
    /**
     * Angle, in radians, from centre of spotlight where falloff begins. Must be ≥ 0 and
     * < outerConeAngle.
     */
    getInnerConeAngle(): number;
    /**
     * Angle, in radians, from centre of spotlight where falloff begins. Must be ≥ 0 and
     * < outerConeAngle.
     */
    setInnerConeAngle(angle: number): this;
    /**
     * Angle, in radians, from centre of spotlight where falloff ends. Must be > innerConeAngle and
     * ≤ PI / 2.0.
     */
    getOuterConeAngle(): number;
    /**
     * Angle, in radians, from centre of spotlight where falloff ends. Must be > innerConeAngle and
     * ≤ PI / 2.0.
     */
    setOuterConeAngle(angle: number): this;
}
export {};
