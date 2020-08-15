import { PropertyType } from '../constants';

/**
 * # TextureInfo
 *
 * *Settings associated with a particular use of a {@link Texture}.*
 *
 * Different materials may reuse the same texture but with different texture coordinates. For other
 * settings affecting application of a texture, see {@link TextureSampler}.
 *
 * References:
 * - [glTF → Texture Info](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#reference-textureinfo)
 *
 * @category Properties
 */
export class TextureInfo {
	public readonly propertyType = PropertyType.TEXTURE_INFO;

	private texCoord = 0;

	public copy(other: this): this {
		this.texCoord = other.texCoord;
		return this;
	}

	/** Returns the texture coordinate (UV set) index for the texture. */
	public getTexCoord(): number { return this.texCoord; }

	/** Sets the texture coordinate (UV set) index for the texture. */
	public setTexCoord(texCoord: number): this {
		this.texCoord = texCoord;
		return this;
	}
}
