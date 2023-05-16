import { Nullable, PropertyType } from '../constants.js';
import type { GLTF } from '../types/gltf.js';
import { ExtensibleProperty, IExtensibleProperty } from './extensible-property.js';

interface ITextureInfo extends IExtensibleProperty {
	texCoord: number;

	// Sampler properties are also attached to TextureInfo, for simplicity.
	magFilter: GLTF.TextureMagFilter | null;
	minFilter: GLTF.TextureMinFilter | null;
	wrapS: GLTF.TextureWrapMode;
	wrapT: GLTF.TextureWrapMode;
}

/**
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
 * - [glTF → Texture Info](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#reference-textureinfo)
 *
 * @category Properties
 */
export class TextureInfo extends ExtensibleProperty<ITextureInfo> {
	public declare propertyType: PropertyType.TEXTURE_INFO;

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
	};

	/** Magnification filter. Values correspond to WebGL enums. */
	public static MagFilter: Record<string, GLTF.TextureMagFilter> = {
		/** */
		NEAREST: 9728,
		/** */
		LINEAR: 9729,
	};

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
	};

	/**********************************************************************************************
	 * Instance.
	 */

	protected init(): void {
		this.propertyType = PropertyType.TEXTURE_INFO;
	}

	protected getDefaults(): Nullable<ITextureInfo> {
		return Object.assign(super.getDefaults() as IExtensibleProperty, {
			texCoord: 0,
			magFilter: null,
			minFilter: null,
			wrapS: TextureInfo.WrapMode.REPEAT,
			wrapT: TextureInfo.WrapMode.REPEAT,
		});
	}

	/**********************************************************************************************
	 * Texture coordinates.
	 */

	/** Returns the texture coordinate (UV set) index for the texture. */
	public getTexCoord(): number {
		return this.get('texCoord');
	}

	/** Sets the texture coordinate (UV set) index for the texture. */
	public setTexCoord(texCoord: number): this {
		return this.set('texCoord', texCoord);
	}

	/**********************************************************************************************
	 * Min/mag filter.
	 */

	/** Returns the magnification filter applied to the texture. */
	public getMagFilter(): GLTF.TextureMagFilter | null {
		return this.get('magFilter');
	}

	/** Sets the magnification filter applied to the texture. */
	public setMagFilter(magFilter: GLTF.TextureMagFilter | null): this {
		return this.set('magFilter', magFilter);
	}

	/** Sets the minification filter applied to the texture. */
	public getMinFilter(): GLTF.TextureMinFilter | null {
		return this.get('minFilter');
	}

	/** Returns the minification filter applied to the texture. */
	public setMinFilter(minFilter: GLTF.TextureMinFilter | null): this {
		return this.set('minFilter', minFilter);
	}

	/**********************************************************************************************
	 * UV wrapping.
	 */

	/** Returns the S (U) wrapping mode for UVs used by the texture. */
	public getWrapS(): GLTF.TextureWrapMode {
		return this.get('wrapS');
	}

	/** Sets the S (U) wrapping mode for UVs used by the texture. */
	public setWrapS(wrapS: GLTF.TextureWrapMode): this {
		return this.set('wrapS', wrapS);
	}

	/** Returns the T (V) wrapping mode for UVs used by the texture. */
	public getWrapT(): GLTF.TextureWrapMode {
		return this.get('wrapT');
	}

	/** Sets the T (V) wrapping mode for UVs used by the texture. */
	public setWrapT(wrapT: GLTF.TextureWrapMode): this {
		return this.set('wrapT', wrapT);
	}
}
