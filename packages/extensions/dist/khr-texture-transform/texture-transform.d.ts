import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { Transform } from './transform';
/**
 * # TextureTransform
 *
 * [`KHR_texture_transform`](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_texture_transform/)
 * adds offset, rotation, and scale to {@link TextureInfo} properties.
 *
 * Affine UV transforms are useful for reducing the number of textures the GPU must load, improving
 * performance when used in techniques like texture atlases. UV transforms cannot be animated at
 * this time.
 *
 * Properties:
 * - {@link Transform}
 *
 * ### Example
 *
 * The `TextureTransform` class provides a single {@link ExtensionProperty} type, `Transform`, which
 * may be attached to any {@link TextureInfo} instance. For example:
 *
 * ```typescript
 * import { TextureTransform } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const transformExtension = document.createExtension(TextureTransform)
 * 	.setRequired(true);
 *
 * // Create a reusable Transform.
 * const transform = transformExtension.createTransform()
 * 	.setScale([100, 100]);
 *
 * // Apply the Transform to a Material's baseColorTexture.
 * document.createMaterial()
 * 	.setBaseColorTexture(myTexture)
 * 	.getBaseColorTextureInfo()
 * 	.setExtension('KHR_texture_transform', transform);
 * ```
 */
export declare class TextureTransform extends Extension {
    readonly extensionName = "KHR_texture_transform";
    static readonly EXTENSION_NAME = "KHR_texture_transform";
    /** Creates a new Transform property for use on a {@link TextureInfo}. */
    createTransform(): Transform;
    /** @hidden */
    read(context: ReaderContext): this;
    /** @hidden */
    write(context: WriterContext): this;
}
