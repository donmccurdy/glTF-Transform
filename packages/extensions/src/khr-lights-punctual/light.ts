import { ExtensionProperty, IProperty, Nullable, PropertyType, vec3 } from '@gltf-transform/core';
import { KHR_LIGHTS_PUNCTUAL } from '../constants.js';

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
 * Defines a light attached to a {@link Node}. See {@link KHRLightsPunctual}.
 */
export class Light extends ExtensionProperty<ILight> {
	public static EXTENSION_NAME = KHR_LIGHTS_PUNCTUAL;
	public declare extensionName: typeof KHR_LIGHTS_PUNCTUAL;
	public declare propertyType: 'Light';
	public declare parentTypes: [PropertyType.NODE];

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

	protected init(): void {
		this.extensionName = KHR_LIGHTS_PUNCTUAL;
		this.propertyType = 'Light';
		this.parentTypes = [PropertyType.NODE];
	}

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

	/** Light color; Linear-sRGB components. */
	public getColor(): vec3 {
		return this.get('color');
	}

	/** Light color; Linear-sRGB components. */
	public setColor(color: vec3): this {
		return this.set('color', color);
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
	 * Angle, in radians, from centre of spotlight where falloff begins. Must be >= 0 and
	 * < outerConeAngle.
	 */
	public getInnerConeAngle(): number {
		return this.get('innerConeAngle');
	}

	/**
	 * Angle, in radians, from centre of spotlight where falloff begins. Must be >= 0 and
	 * < outerConeAngle.
	 */
	public setInnerConeAngle(angle: number): this {
		return this.set('innerConeAngle', angle);
	}

	/**
	 * Angle, in radians, from centre of spotlight where falloff ends. Must be > innerConeAngle and
	 * <= PI / 2.0.
	 */
	public getOuterConeAngle(): number {
		return this.get('outerConeAngle');
	}

	/**
	 * Angle, in radians, from centre of spotlight where falloff ends. Must be > innerConeAngle and
	 * <= PI / 2.0.
	 */
	public setOuterConeAngle(angle: number): this {
		return this.set('outerConeAngle', angle);
	}
}
