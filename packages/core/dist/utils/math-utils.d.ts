import { mat4, vec3, vec4 } from '../constants';
import { GLTF } from '../types/gltf';
/** @hidden */
export declare class MathUtils {
    static identity(v: number): number;
    static eq(a: number[], b: number[]): boolean;
    static denormalize(c: number, componentType: GLTF.AccessorComponentType): number;
    static normalize(f: number, componentType: GLTF.AccessorComponentType): number;
    /**
     * Decompose a mat4 to TRS properties.
     *
     * Equivalent to the Matrix4 decompose() method in three.js, and intentionally not using the
     * gl-matrix version. See: https://github.com/toji/gl-matrix/issues/408
     *
     * @param srcMat Matrix element, to be decomposed to TRS properties.
     * @param dstTranslation Translation element, to be overwritten.
     * @param dstRotation Rotation element, to be overwritten.
     * @param dstScale Scale element, to be overwritten.
     */
    static decompose(srcMat: mat4, dstTranslation: vec3, dstRotation: vec4, dstScale: vec3): void;
    /**
     * Compose TRS properties to a mat4.
     *
     * Equivalent to the Matrix4 compose() method in three.js, and intentionally not using the
     * gl-matrix version. See: https://github.com/toji/gl-matrix/issues/408
     *
     * @param srcTranslation Translation element of matrix.
     * @param srcRotation Rotation element of matrix.
     * @param srcScale Scale element of matrix.
     * @param dstMat Matrix element, to be modified and returned.
     * @returns dstMat, overwritten to mat4 equivalent of given TRS properties.
     */
    static compose(srcTranslation: vec3, srcRotation: vec4, srcScale: vec3, dstMat: mat4): mat4;
}
