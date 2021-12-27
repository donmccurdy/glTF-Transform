import { Nullable, PropertyType } from '../constants';
import { GLTF } from '../types/gltf';
import { ExtensibleProperty, IExtensibleProperty } from './extensible-property';
interface ICamera extends IExtensibleProperty {
    type: GLTF.CameraType;
    znear: number;
    zfar: number;
    aspectRatio: number | null;
    yfov: number;
    xmag: number;
    ymag: number;
}
/**
 * # Camera
 *
 * *Cameras are perspectives through which the {@link Scene} may be viewed.*
 *
 * Projection can be perspective or orthographic. Cameras are contained in nodes and thus can be
 * transformed. The camera is defined such that the local +X axis is to the right, the lens looks
 * towards the local -Z axis, and the top of the camera is aligned with the local +Y axis. If no
 * transformation is specified, the location of the camera is at the origin.
 *
 * Usage:
 *
 * ```typescript
 * const camera = doc.createCamera('myCamera')
 * 	.setType(GLTF.CameraType.PERSPECTIVE)
 * 	.setZNear(0.1)
 * 	.setZFar(100)
 * 	.setYFov(Math.PI / 4)
 * 	.setAspectRatio(1.5);
 *
 * node.setCamera(camera);
 * ```
 *
 * References:
 * - [glTF → Cameras](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#cameras)
 *
 * @category Properties
 */
export declare class Camera extends ExtensibleProperty<ICamera> {
    propertyType: PropertyType.CAMERA;
    /**********************************************************************************************
     * Constants.
     */
    static Type: Record<string, GLTF.CameraType>;
    /**********************************************************************************************
     * Instance.
     */
    protected init(): void;
    protected getDefaults(): Nullable<ICamera>;
    /**********************************************************************************************
     * Common.
     */
    /** Specifies if the camera uses a perspective or orthographic projection. */
    getType(): GLTF.CameraType;
    /** Specifies if the camera uses a perspective or orthographic projection. */
    setType(type: GLTF.CameraType): this;
    /** Floating-point distance to the near clipping plane. */
    getZNear(): number;
    /** Floating-point distance to the near clipping plane. */
    setZNear(znear: number): this;
    /**
     * Floating-point distance to the far clipping plane. When defined, zfar must be greater than
     * znear. If zfar is undefined, runtime must use infinite projection matrix.
     */
    getZFar(): number;
    /**
     * Floating-point distance to the far clipping plane. When defined, zfar must be greater than
     * znear. If zfar is undefined, runtime must use infinite projection matrix.
     */
    setZFar(zfar: number): this;
    /**********************************************************************************************
     * Perspective.
     */
    /**
     * Floating-point aspect ratio of the field of view. When undefined, the aspect ratio of the
     * canvas is used.
     */
    getAspectRatio(): number | null;
    /**
     * Floating-point aspect ratio of the field of view. When undefined, the aspect ratio of the
     * canvas is used.
     */
    setAspectRatio(aspectRatio: number | null): this;
    /** Floating-point vertical field of view in radians. */
    getYFov(): number;
    /** Floating-point vertical field of view in radians. */
    setYFov(yfov: number): this;
    /**********************************************************************************************
     * Orthographic.
     */
    /**
     * Floating-point horizontal magnification of the view, and half the view's width
     * in world units.
     */
    getXMag(): number;
    /**
     * Floating-point horizontal magnification of the view, and half the view's width
     * in world units.
     */
    setXMag(xmag: number): this;
    /**
     * Floating-point vertical magnification of the view, and half the view's height
     * in world units.
     */
    getYMag(): number;
    /**
     * Floating-point vertical magnification of the view, and half the view's height
     * in world units.
     */
    setYMag(ymag: number): this;
}
export {};
