import { ExtensionProperty, IProperty, PropertyType, vec3 } from '@gltf-transform/core';
import { ColorUtils } from '@gltf-transform/core';
import { KHR_LIGHTS_PUNCTUAL, Nullable } from '../constants';

interface ILight extends IProperty {
	color: vec3;
	intensity: number;
	type: PunctualLightType;
	range: number | null;
	innerConeAngle: number;
	outerConeAngle: number;
}

type PunctualLightType = 'point' | 'spot' | 'directional';

/**
 * # Light
 *
 * Defines a light attached to a {@link Node}. See {@link LightsPunctual}.
 */
export class Light extends ExtensionProperty<ILight> {
	public readonly propertyType = 'Light';
	public readonly parentTypes = [PropertyType.NODE];
	public readonly extensionName = KHR_LIGHTS_PUNCTUAL;
	public static EXTENSION_NAME = KHR_LIGHTS_PUNCTUAL;

	/**********************************************************************************************
	 * CONSTANTS.
	 */

	public static Type: Record<string, PunctualLightType> = {
		POINT: 'point',
		SPOT: 'spot',
		DIRECTIONAL: 'directional',
	};

	/**********************************************************************************************
	 * INSTANCE.
	 */

	protected getDefaults(): Nullable<ILight> {
		return Object.assign(super.getDefaults() as IProperty, {
			color: [1, 1, 1] as vec3,
			intensity: 1,
			type: Light.Type.POINT,
			range: null,
			innerConeAngle: 0,
			outerConeAngle: Math.PI / 4,
		});
	}

	/**********************************************************************************************
	 * COLOR.
	 */

	/** Components (R, G, B) of light's color in linear space. */
	public getColor(): vec3 {
		return this.get('color');
	}

	/** Components (R, G, B) of light's color in linear space. */
	public setColor(color: vec3): this {
		return this.set('color', color);
	}

	/** Hex light color in sRGB colorspace. */
	public getColorHex(): number {
		return ColorUtils.factorToHex(this.getColor());
	}

	/** Hex light color in sRGB colorspace. */
	public setColorHex(hex: number): this {
		const color = this.getColor().slice() as vec3;
		ColorUtils.hexToFactor(hex, color);
		return this.setColor(color);
	}

	/**********************************************************************************************
	 * INTENSITY.
	 */

	/**
	 * Brightness of light. Units depend on the type of light: point and spot lights use luminous
	 * intensity in candela (lm/sr) while directional lights use illuminance in lux (lm/m2).
	 */
	public getIntensity(): number {
		return this.get('intensity');
	}

	/**
	 * Brightness of light. Units depend on the type of light: point and spot lights use luminous
	 * intensity in candela (lm/sr) while directional lights use illuminance in lux (lm/m2).
	 */
	public setIntensity(intensity: number): this {
		return this.set('intensity', intensity);
	}

	/**********************************************************************************************
	 * TYPE.
	 */

	/** Type. */
	public getType(): PunctualLightType {
		return this.get('type');
	}

	/** Type. */
	public setType(type: PunctualLightType): this {
		return this.set('type', type);
	}

	/**********************************************************************************************
	 * RANGE.
	 */

	/**
	 * Hint defining a distance cutoff at which the light's intensity may be considered to have
	 * reached zero. Supported only for point and spot lights. Must be > 0. When undefined, range
	 * is assumed to be infinite.
	 */
	public getRange(): number | null {
		return this.get('range');
	}

	/**
	 * Hint defining a distance cutoff at which the light's intensity may be considered to have
	 * reached zero. Supported only for point and spot lights. Must be > 0. When undefined, range
	 * is assumed to be infinite.
	 */
	public setRange(range: number | null): this {
		return this.set('range', range);
	}

	/**********************************************************************************************
	 * SPOT LIGHT PROPERTIES
	 */

	/**
	 * Angle, in radians, from centre of spotlight where falloff begins. Must be ≥ 0 and
	 * < outerConeAngle.
	 */
	public getInnerConeAngle(): number {
		return this.get('innerConeAngle');
	}

	/**
	 * Angle, in radians, from centre of spotlight where falloff begins. Must be ≥ 0 and
	 * < outerConeAngle.
	 */
	public setInnerConeAngle(innerConeAngle: number): this {
		return this.set('innerConeAngle', innerConeAngle);
	}

	/**
	 * Angle, in radians, from centre of spotlight where falloff ends. Must be > innerConeAngle and
	 * ≤ PI / 2.0.
	 */
	public getOuterConeAngle(): number {
		return this.get('outerConeAngle');
	}

	/**
	 * Angle, in radians, from centre of spotlight where falloff ends. Must be > innerConeAngle and
	 * ≤ PI / 2.0.
	 */
	public setOuterConeAngle(outerConeAngle: number): this {
		return this.set('outerConeAngle', outerConeAngle);
	}
}
