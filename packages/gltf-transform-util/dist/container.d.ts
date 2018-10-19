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
    addImage(name: string, file: ArrayBuffer, type: string): GLTFContainer;
    /**
     * Removes an image from the glTF container. Fails if image is still in use.
     * @param container
     * @param index
     */
    removeImage(index: number): GLTFContainer;
    /**
     * Adds a new buffer to the glTF container.
     * @param container
     * @param name
     * @param buffer
     */
    addBuffer(name: string, buffer: ArrayBuffer): GLTFContainer;
    /**
     * Removes a buffer from the glTF container. Fails if buffer is still in use.
     * @param container
     * @param index
     */
    removeBuffer(index: number): GLTFContainer;
    addAccessor(array: Float32Array | Uint32Array | Uint16Array, type: GLTF.AccessorType, target: number): GLTFContainer;
    /**
     * Returns the accessor for the given index, as a typed array.
     * @param index
     */
    getAccessorArray(index: number): Float32Array | Uint32Array | Uint16Array;
}
export { GLTFContainer, IBufferMap };
