import { JSONDocument } from '../json-document';
import { Accessor, Animation, Buffer, Camera, Material, Mesh, Node, Scene, Skin, Texture, TextureInfo } from '../properties';
import { GLTF } from '../types/gltf';
/**
 * Model class providing glTF-Transform objects representing each definition in the glTF file, used
 * by a {@link Writer} and its {@link Extension} implementations. Indices of all properties will be
 * consistent with the glTF file.
 *
 * @hidden
 */
export declare class ReaderContext {
    readonly jsonDoc: JSONDocument;
    buffers: Buffer[];
    bufferViews: Uint8Array[];
    bufferViewBuffers: Buffer[];
    accessors: Accessor[];
    textures: Texture[];
    textureInfos: Map<TextureInfo, GLTF.ITextureInfo>;
    materials: Material[];
    meshes: Mesh[];
    cameras: Camera[];
    nodes: Node[];
    skins: Skin[];
    animations: Animation[];
    scenes: Scene[];
    constructor(jsonDoc: JSONDocument);
    setTextureInfo(textureInfo: TextureInfo, textureInfoDef: GLTF.ITextureInfo): void;
}
