import { COPY_IDENTITY, ExtensionProperty, vec2 } from '@gltf-transform/core';
import { PropertyType } from '@gltf-transform/core';
import { KHR_TEXTURE_TRANSFORM } from '../constants';

/**
 * # Transform
 *
 * Defines UV transform for a {@link TextureInfo}. See {@link TextureTransform}.
 */
export class Transform extends ExtensionProperty {
	public readonly propertyType = 'Transform';
	public readonly parentTypes = [PropertyType.TEXTURE_INFO];
	public readonly extensionName = KHR_TEXTURE_TRANSFORM;
	public static EXTENSION_NAME = KHR_TEXTURE_TRANSFORM;

	private _offset: vec2 = [0, 0];
	private _rotation = 0;
	private _scale: vec2 = [1, 1];
	private _texCoord: number | null = null;

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this._offset = other._offset;
		this._rotation = other._rotation;
		this._scale = other._scale;
		this._texCoord = other._texCoord;

		return this;
	}

	public getOffset(): vec2 { return this._offset; }
	public setOffset(offset: vec2): this {
		this._offset = offset;
		return this;
	}

	public getRotation(): number { return this._rotation; }
	public setRotation(rotation: number): this {
		this._rotation = rotation;
		return this;
	}

	public getScale(): vec2 { return this._scale; }
	public setScale(scale: vec2): this {
		this._scale = scale;
		return this;
	}

	public getTexCoord(): number | null { return this._texCoord; }
	public setTexCoord(texCoord: number): this {
		this._texCoord = texCoord;
		return this;
	}
}
