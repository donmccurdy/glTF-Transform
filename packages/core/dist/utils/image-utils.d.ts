import { vec2 } from '../constants';
/** Implements support for an image format in the {@link ImageUtils} class. */
export interface ImageUtilsFormat {
    match(buffer: Uint8Array): boolean;
    getSize(buffer: Uint8Array): vec2 | null;
    getChannels(buffer: Uint8Array): number | null;
    getGPUByteLength?(buffer: Uint8Array): number | null;
}
/**
 * # ImageUtils
 *
 * *Common utilities for working with image data.*
 *
 * @category Utilities
 */
export declare class ImageUtils {
    static impls: Record<string, ImageUtilsFormat>;
    /** Registers support for a new image format; useful for certain extensions. */
    static registerFormat(mimeType: string, impl: ImageUtilsFormat): void;
    /**
     * Returns detected MIME type of the given image buffer. Note that for image
     * formats with support provided by extensions, the extension must be
     * registered with an I/O class before it can be detected by ImageUtils.
     */
    static getMimeType(buffer: Uint8Array): string | null;
    /** Returns the dimensions of the image. */
    static getSize(buffer: Uint8Array, mimeType: string): vec2 | null;
    /**
     * Returns a conservative estimate of the number of channels in the image. For some image
     * formats, the method may return 4 indicating the possibility of an alpha channel, without
     * the ability to guarantee that an alpha channel is present.
     */
    static getChannels(buffer: Uint8Array, mimeType: string): number | null;
    /** Returns a conservative estimate of the GPU memory required by this image. */
    static getMemSize(buffer: Uint8Array, mimeType: string): number | null;
    /** Returns the preferred file extension for the given MIME type. */
    static mimeTypeToExtension(mimeType: string): string;
    /** Returns the MIME type for the given file extension. */
    static extensionToMimeType(extension: string): string;
}
