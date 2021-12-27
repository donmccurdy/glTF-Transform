import { Document, GLTF } from '@gltf-transform/core';
/** Inspects the contents of a glTF file and returns a JSON report. */
export declare function inspect(doc: Document): InspectReport;
export interface InspectReport {
    scenes: InspectPropertyReport<InspectSceneReport>;
    meshes: InspectPropertyReport<InspectMeshReport>;
    materials: InspectPropertyReport<InspectMaterialReport>;
    textures: InspectPropertyReport<InspectTextureReport>;
    animations: InspectPropertyReport<InspectAnimationReport>;
}
export interface InspectPropertyReport<T> {
    properties: T[];
    errors?: string[];
    warnings?: string[];
}
export interface InspectSceneReport {
    name: string;
    rootName: string;
    bboxMin: number[];
    bboxMax: number[];
}
export interface InspectMeshReport {
    name: string;
    primitives: number;
    mode: string[];
    vertices: number;
    glPrimitives: number;
    indices: string[];
    attributes: string[];
    instances: number;
    size: number;
}
export interface InspectMaterialReport {
    name: string;
    instances: number;
    textures: string[];
    alphaMode: GLTF.MaterialAlphaMode;
    doubleSided: boolean;
}
export interface InspectTextureReport {
    name: string;
    uri: string;
    slots: string[];
    instances: number;
    mimeType: string;
    resolution: string;
    size: number;
    gpuSize: number | null;
}
export interface InspectAnimationReport {
    name: string;
    channels: number;
    samplers: number;
    keyframes: number;
    duration: number;
    size: number;
}
