import { COPY_IDENTITY, ExtensionProperty, PropertyType, vec3 } from '@gltf-transform/core';
import { KHR_LIGHTS_PUNCTUAL } from '../constants';

export enum LightType {
	POINT = 'point',
	SPOT = 'spot',
	DIRECTIONAL = 'directional',
}

/** Documentation in {@link EXTENSIONS.md}. */
export class Light extends ExtensionProperty {
	public readonly propertyType = 'Light';
	public readonly parentTypes = [PropertyType.NODE];
	public readonly extensionName = KHR_LIGHTS_PUNCTUAL;
	public static EXTENSION_NAME = KHR_LIGHTS_PUNCTUAL;

	private _color: vec3 = [1, 1, 1];
	private _intensity = 1;
	private _type: LightType;
	private _range: number = undefined;

	private _innerConeAngle = 0;
	private _outerConeAngle = Math.PI / 4;

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this._color = [...other._color] as vec3;
		this._intensity = other._intensity;
		this._type = other._type;
		this._range = other._range;

		this._innerConeAngle = other._innerConeAngle;
		this._outerConeAngle = other._outerConeAngle;

		return this;
	}

	/**********************************************************************************************
	 * COLOR.
	 */

	/** RGB value for light's color in linear space.. */
	public getColor(): vec3 { return this._color; }

	/** RGB value for light's color in linear space.. */
	public setColor(color: vec3): this {
		this._color = color;
		return this;
	}

	/**********************************************************************************************
	 * INTENSITY.
	 */

	/**
	 * Brightness of light. Units depend on the type of light: point and spot lights use luminous
	 * intensity in candela (lm/sr) while directional lights use illuminance in lux (lm/m2).
	 */
	public getIntensity(): number { return this._intensity; }

	/**
	 * Brightness of light. Units depend on the type of light: point and spot lights use luminous
	 * intensity in candela (lm/sr) while directional lights use illuminance in lux (lm/m2).
	 */
	public setIntensity(intensity: number): this {
		this._intensity = intensity;
		return this;
	}

	/**********************************************************************************************
	 * TYPE.
	 */

	/** Type. */
	public getType(): LightType { return this._type; }

	/** Type. */
	public setType(type: LightType): this {
		this._type = type;
		return this;
	}

	/**********************************************************************************************
	 * RANGE.
	 */

	/**
	 * Hint defining a distance cutoff at which the light's intensity may be considered to have
	 * reached zero. Supported only for point and spot lights. Must be > 0. When undefined, range
	 * is assumed to be infinite.
	 */
	public getRange(): number { return this._range; }

	/**
	 * Hint defining a distance cutoff at which the light's intensity may be considered to have
	 * reached zero. Supported only for point and spot lights. Must be > 0. When undefined, range
	 * is assumed to be infinite.
	 */
	public setRange(range: number): this {
		this._range = range;
		return this;
	}

	/**********************************************************************************************
	 * SPOT LIGHT PROPERTIES
	 */

	/**
	 * Angle, in radians, from centre of spotlight where falloff begins. Must be ≥ 0 and
	 * < outerConeAngle.
	 */
	public getInnerConeAngle(): number { return this._innerConeAngle; }

	/**
	 * Angle, in radians, from centre of spotlight where falloff begins. Must be ≥ 0 and
	 * < outerConeAngle.
	 */
	public setInnerConeAngle(innerConeAngle: number): this {
		this._innerConeAngle = innerConeAngle;
		return this;
	}

	/**
	 * Angle, in radians, from centre of spotlight where falloff ends. Must be > innerConeAngle and
	 * ≤ PI / 2.0.
	 */
	public getOuterConeAngle(): number { return this._outerConeAngle; }

	/**
	 * Angle, in radians, from centre of spotlight where falloff ends. Must be > innerConeAngle and
	 * ≤ PI / 2.0.
	 */
	public setOuterConeAngle(outerConeAngle: number): this {
		this._outerConeAngle = outerConeAngle;
		return this;
	}
}
