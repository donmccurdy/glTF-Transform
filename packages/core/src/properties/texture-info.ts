import { PropertyType } from '../constants';
import { GLTF } from '../types/gltf';
import { ExtensibleProperty } from './extensible-property';
import { COPY_IDENTITY } from './property';

/**
 * # TextureInfo
 *
 * *Settings associated with a particular use of a {@link Texture}.*
 *
 * Different materials may reuse the same texture but with different texture coordinates,
 * minFilter/magFilter, or wrapS/wrapT settings. The TextureInfo class contains settings
 * derived from both the "TextureInfo" and "Sampler" properties in the glTF specification,
 * consolidated here for simplicity.
 *
 * TextureInfo properties cannot be directly created. For any material texture slot, such as
 * baseColorTexture, there will be a corresponding method to obtain the TextureInfo for that slot.
 * For example, see {@link Material.getBaseColorTextureInfo}.
 *
 * References:
 * - [glTF → Texture Info](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#reference-textureinfo)
 *
 * @category Properties
 */
export class TextureInfo extends ExtensibleProperty {
	public readonly propertyType = PropertyType.TEXTURE_INFO;

	/**********************************************************************************************
	 * Constants.
	 */

	/** UV wrapping mode. Values correspond to WebGL enums. */
	public static WrapMode: Record<string, GLTF.TextureWrapMode> = {
		/** */
		CLAMP_TO_EDGE: 33071,
		/** */
		MIRRORED_REPEAT: 33648,
		/** */
		REPEAT: 10497,
	}

	/** Magnification filter. Values correspond to WebGL enums. */
	public static MagFilter: Record<string, GLTF.TextureMagFilter> = {
		/** */
		NEAREST: 9728,
		/** */
		LINEAR: 9729,
	}

	/** Minification filter. Values correspond to WebGL enums. */
	public static MinFilter: Record<string, GLTF.TextureMinFilter> = {
		/** */
		NEAREST: 9728,
		/** */
		LINEAR: 9729,
		/** */
		NEAREST_MIPMAP_NEAREST: 9984,
		/** */
		LINEAR_MIPMAP_NEAREST: 9985,
		/** */
		NEAREST_MIPMAP_LINEAR: 9986,
		/** */
		LINEAR_MIPMAP_LINEAR: 9987,
	}

	/**********************************************************************************************
	 * Instance.
	 */

	private _texCoord = 0;

	// Sampler properties are also attached to TextureInfo, for simplicity.
	private _magFilter: GLTF.TextureMagFilter | null = null;
	private _minFilter: GLTF.TextureMinFilter | null = null;
	private _wrapS: GLTF.TextureWrapMode = TextureInfo.WrapMode.REPEAT;
	private _wrapT: GLTF.TextureWrapMode = TextureInfo.WrapMode.REPEAT;

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

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
	public getMagFilter(): GLTF.TextureMagFilter | null { return this._magFilter; }

	/** Sets the magnification filter applied to the texture. */
	public setMagFilter(magFilter: GLTF.TextureMagFilter | null): this {
		this._magFilter = magFilter;
		return this;
	}

	/** Sets the minification filter applied to the texture. */
	public getMinFilter(): GLTF.TextureMinFilter | null { return this._minFilter; }

	/** Returns the minification filter applied to the texture. */
	public setMinFilter(minFilter: GLTF.TextureMinFilter | null): this {
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
