import { ExtensionProperty, vec2 } from '@gltf-transform/core';
import { PropertyType } from '@gltf-transform/core';
import { IProperty } from 'core/dist/properties';
import { KHR_TEXTURE_TRANSFORM, Nullable } from '../constants';

interface ITransform extends IProperty {
	offset: vec2;
	rotation: number;
	scale: vec2;
	texCoord: number | null; // null → do not override TextureInfo.
}

/**
 * # Transform
 *
 * Defines UV transform for a {@link TextureInfo}. See {@link TextureTransform}.
 */
export class Transform extends ExtensionProperty<ITransform> {
	public readonly propertyType = 'Transform';
	public readonly parentTypes = [PropertyType.TEXTURE_INFO];
	public readonly extensionName = KHR_TEXTURE_TRANSFORM;
	public static EXTENSION_NAME = KHR_TEXTURE_TRANSFORM;

	protected getDefaultAttributes(): Nullable<ITransform> {
		return Object.assign(super.getDefaultAttributes(), {
			offset: [0.0, 0.0],
			rotation: 0,
			scale: [1.0, 1.0],
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
	public setTexCoord(texCoord: number): this {
		return this.set('texCoord', texCoord);
	}
}
