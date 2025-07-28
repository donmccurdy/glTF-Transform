import { ExtensionProperty, type IProperty, type Nullable, PropertyType, type vec2 } from '@gltf-transform/core';
import { KHR_TEXTURE_TRANSFORM } from '../constants.js';

interface ITransform extends IProperty {
	offset: vec2;
	rotation: number;
	scale: vec2;
	texCoord: number | null; // null → do not override TextureInfo.
}

/**
 * Defines UV transform for a {@link TextureInfo}. See {@link KHRTextureTransform}.
 */
export class Transform extends ExtensionProperty<ITransform> {
	public static EXTENSION_NAME: typeof KHR_TEXTURE_TRANSFORM = KHR_TEXTURE_TRANSFORM;
	public declare extensionName: typeof KHR_TEXTURE_TRANSFORM;
	public declare propertyType: 'Transform';
	public declare parentTypes: [PropertyType.TEXTURE_INFO];

	protected init(): void {
		this.extensionName = KHR_TEXTURE_TRANSFORM;
		this.propertyType = 'Transform';
		this.parentTypes = [PropertyType.TEXTURE_INFO];
	}

	protected getDefaults(): Nullable<ITransform> {
		return Object.assign(super.getDefaults() as IProperty, {
			offset: [0.0, 0.0] as vec2,
			rotation: 0,
			scale: [1.0, 1.0] as vec2,
			texCoord: null,
		});
	}

	public getOffset(): vec2 {
		return this.get('offset');
	}
	public setOffset(offset: vec2): this {
		return this.set('offset', offset);
	}

	public getRotation(): number {
		return this.get('rotation');
	}
	public setRotation(rotation: number): this {
		return this.set('rotation', rotation);
	}

	public getScale(): vec2 {
		return this.get('scale');
	}
	public setScale(scale: vec2): this {
		return this.set('scale', scale);
	}

	public getTexCoord(): number | null {
		return this.get('texCoord');
	}
	public setTexCoord(texCoord: number | null): this {
		return this.set('texCoord', texCoord);
	}
}
