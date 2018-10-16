interface IBufferMap {
    [s: string]: ArrayBuffer;
}
/**
 * Wrapper for a glTF asset.
 */
declare class GLTFContainer {
    json: GLTF.IGLTF;
    resources: IBufferMap;
    constructor(json: GLTF.IGLTF, resources: IBufferMap);
    /**
     * Resolves a resource URI.
     * @param uri
     */
    resolveURI(uri: string): ArrayBuffer;
    /**
     * Adds a new image to the glTF container.
     * @param container
     * @param name
     * @param file
     * @param type
     */
    static addImage(container: GLTFContainer, name: string, file: ArrayBuffer, type: string): GLTFContainer;
    /**
     * Removes an image from the glTF container. Fails if image is still in use.
     * @param container
     * @param index
     */
    static removeImage(container: GLTFContainer, index: number): GLTFContainer;
    /**
     * Adds a new buffer to the glTF container.
     * @param container
     * @param name
     * @param buffer
     */
    static addBuffer(container: GLTFContainer, name: string, buffer: ArrayBuffer): GLTFContainer;
    /**
     * Removes a buffer from the glTF container. Fails if buffer is still in use.
     * @param container
     * @param index
     */
    static removeBuffer(container: GLTFContainer, index: number): GLTFContainer;
}
export { GLTFContainer, IBufferMap };
