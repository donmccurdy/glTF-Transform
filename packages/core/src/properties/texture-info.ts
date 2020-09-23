import { PropertyType } from '../constants';
import { ExtensibleProperty } from './extensible-property';

/**
 * # TextureInfo
 *
 * *Settings associated with a particular use of a {@link Texture}.*
 *
 * Different materials may reuse the same texture but with different texture coordinates.
 *
 * References:
 * - [glTF → Texture Info](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#reference-textureinfo)
 *
 * @category Properties
 */
export class TextureInfo extends ExtensibleProperty {
	public readonly propertyType = PropertyType.TEXTURE_INFO;

	private _texCoord = 0;

	// Sampler properties are also attached to TextureInfo, for simplicity.
	private _magFilter: GLTF.TextureMagFilter = null;
	private _minFilter: GLTF.TextureMinFilter = null;
	private _wrapS: GLTF.TextureWrapMode = GLTF.TextureWrapMode.REPEAT;
	private _wrapT: GLTF.TextureWrapMode = GLTF.TextureWrapMode.REPEAT;

	/** UV wrapping mode. Values correspond to WebGL enums. */
	public static TextureWrapMode = {
		CLAMP_TO_EDGE: GLTF.TextureWrapMode.CLAMP_TO_EDGE,
		MIRRORED_REPEAT: GLTF.TextureWrapMode.MIRRORED_REPEAT,
		REPEAT: GLTF.TextureWrapMode.REPEAT,
	}

	/** Magnification filter. Values correspond to WebGL enums. */
	public static TextureMagFilter = {
		NEAREST: GLTF.TextureMagFilter.NEAREST,
		LINEAR: GLTF.TextureMagFilter.LINEAR,
	}

	/** Minification filter. Values correspond to WebGL enums. */
	public static TextureMinFilter = {
		NEAREST: GLTF.TextureMinFilter.NEAREST,
		LINEAR: GLTF.TextureMinFilter.LINEAR,
		NEAREST_MIPMAP_NEAREST: GLTF.TextureMinFilter.NEAREST_MIPMAP_NEAREST,
		LINEAR_MIPMAP_NEAREST: GLTF.TextureMinFilter.LINEAR_MIPMAP_NEAREST,
		NEAREST_MIPMAP_LINEAR: GLTF.TextureMinFilter.NEAREST_MIPMAP_LINEAR,
		LINEAR_MIPMAP_LINEAR: GLTF.TextureMinFilter.LINEAR_MIPMAP_LINEAR,
	}

	public copy(other: this): this {
		this._texCoord = other._texCoord;
		this._magFilter = other._magFilter;
		this._minFilter = other._minFilter;
		this._wrapS = other._wrapS;
		this._wrapT = other._wrapT;
		return this;
	}

	/**********************************************************************************************
	* Texture coordinates.
	*/

	/** Returns the texture coordinate (UV set) index for the texture. */
	public getTexCoord(): number { return this._texCoord; }

	/** Sets the texture coordinate (UV set) index for the texture. */
	public setTexCoord(texCoord: number): this {
		this._texCoord = texCoord;
		return this;
	}

	/**********************************************************************************************
	* Min/mag filter.
	*/

	/** Returns the magnification filter applied to the texture. */
	public getMagFilter(): GLTF.TextureMagFilter { return this._magFilter; }

	/** Sets the magnification filter applied to the texture. */
	public setMagFilter(magFilter: GLTF.TextureMagFilter): this {
		this._magFilter = magFilter;
		return this;
	}

	/** Sets the minification filter applied to the texture. */
	public getMinFilter(): GLTF.TextureMinFilter { return this._minFilter; }

	/** Returns the minification filter applied to the texture. */
	public setMinFilter(minFilter: GLTF.TextureMinFilter): this {
		this._minFilter = minFilter;
		return this;
	}

	/**********************************************************************************************
	* UV wrapping.
	*/

	/** Returns the S (U) wrapping mode for UVs used by the texture. */
	public getWrapS(): GLTF.TextureWrapMode { return this._wrapS; }

	/** Sets the S (U) wrapping mode for UVs used by the texture. */
	public setWrapS(wrapS: GLTF.TextureWrapMode): this {
		this._wrapS = wrapS;
		return this;
	}

	/** Returns the T (V) wrapping mode for UVs used by the texture. */
	public getWrapT(): GLTF.TextureWrapMode { return this._wrapT; }

	/** Sets the T (V) wrapping mode for UVs used by the texture. */
	public setWrapT(wrapT: GLTF.TextureWrapMode): this {
		this._wrapT = wrapT;
		return this;
	}
}
