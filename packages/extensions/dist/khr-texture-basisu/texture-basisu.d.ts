import { Extension, PropertyType, ReaderContext, WriterContext } from '@gltf-transform/core';
/**
 * # TextureBasisu
 *
 * [`KHR_texture_basisu`](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_texture_basisu)
 * enables KTX2 GPU textures with Basis Universal supercompression for any material texture.
 *
 * GPU texture formats, unlike traditional image formats, remain compressed in GPU memory. As a
 * result, they (1) upload to the GPU much more quickly, and (2) require much less GPU memory. In
 * certain cases they may also have smaller filesizes than PNG or JPEG textures, but this is not
 * guaranteed. GPU textures often require more careful tuning during compression to maintain image
 * quality, but this extra effort is worthwhile for applications that need to maintain a smooth
 * framerate while uploading images, or where GPU memory is limited.
 *
 * Defining no {@link ExtensionProperty} types, this {@link Extension} is simply attached to the
 * {@link Document}, and affects the entire Document by allowing use of the `image/ktx2` MIME type
 * and passing KTX2 image data to the {@link Texture.setImage} method. Without the Extension, the
 * same MIME types and image data would yield an invalid glTF document, under the stricter core glTF
 * specification.
 *
 * Properties:
 * - N/A
 *
 * ### Example
 *
 * ```typescript
 * import { TextureBasisu } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const basisuExtension = document.createExtension(TextureBasisu)
 * 	.setRequired(true);
 * document.createTexture('MyCompressedTexture')
 * 	.setMimeType('image/ktx2')
 * 	.setImage(fs.readFileSync('my-texture.ktx2'));
 * ```
 *
 * Compression is not done automatically when adding the extension as shown above — you must
 * compress the image data first, then pass the `.ktx2` payload to {@link Texture.setImage}. The
 * [glTF-Transform CLI](/cli.html) has functions to help with this, or any similar KTX2-capable
 * utility will work.
 *
 * When the `KHR_texture_basisu` extension is added to a file by glTF-Transform, the extension
 * should always be required. This tool does not support writing assets that "fall back" to optional
 * PNG or JPEG image data.
 *
 * > _**NOTICE:** Compressing some textures — particularly 3-component (RGB) normal maps, and
 * > occlusion/roughness/metalness maps, may give poor results with the ETC1S compression option.
 * > These issues can often be avoided with the larger UASTC compression option, or by upscaling the
 * > texture before compressing it.
 * >
 * > For best results when authoring new textures, use
 * > [texture dilation](https://docs.substance3d.com/spdoc/padding-134643719.html) and minimize
 * > prominent UV seams._
 */
export declare class TextureBasisu extends Extension {
    readonly extensionName = "KHR_texture_basisu";
    /** @hidden */
    readonly prereadTypes: PropertyType[];
    static readonly EXTENSION_NAME = "KHR_texture_basisu";
    /** @hidden */
    static register(): void;
    /** @hidden */
    preread(context: ReaderContext): this;
    /** @hidden */
    read(context: ReaderContext): this;
    /** @hidden */
    write(context: WriterContext): this;
}
