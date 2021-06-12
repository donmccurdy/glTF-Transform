import { PropertyType } from '../constants';
import { GLTF } from '../types/gltf';
import { ExtensibleProperty } from './extensible-property';
import { COPY_IDENTITY } from './property';

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
export class Camera extends ExtensibleProperty {
	public readonly propertyType = PropertyType.CAMERA;

	/**********************************************************************************************
	 * Constants.
	 */

	public static Type: Record<string, GLTF.CameraType> = {
		/** A perspective camera representing a perspective projection matrix. */
		PERSPECTIVE: 'perspective',
		/** An orthographic camera representing an orthographic projection matrix. */
		ORTHOGRAPHIC: 'orthographic',
	}

	/**********************************************************************************************
	 * Instance.
	 */

	// Common.

	private _type: GLTF.CameraType = Camera.Type.PERSPECTIVE;
	private _znear = 0.1;
	private _zfar = 100;

	// Perspective.

	private _aspectRatio: number | null = null;
	private _yfov: number = Math.PI * 2 * 50 / 360; // 50º

	// Orthographic.

	private _xmag = 1;
	private _ymag = 1;

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this._type = other._type;
		this._znear = other._znear;
		this._zfar = other._zfar;
		this._aspectRatio = other._aspectRatio;
		this._yfov = other._yfov;
		this._xmag = other._xmag;
		this._ymag = other._ymag;

		return this;
	}

	/**********************************************************************************************
	 * Common.
	 */

	/** Specifies if the camera uses a perspective or orthographic projection. */
	public getType(): GLTF.CameraType { return this._type; }

	/** Specifies if the camera uses a perspective or orthographic projection. */
	public setType(type: GLTF.CameraType): this {
		this._type = type;
		return this;
	}

	/** Floating-point distance to the near clipping plane. */
	public getZNear(): number { return this._znear; }

	/** Floating-point distance to the near clipping plane. */
	public setZNear(znear: number): this {
		this._znear = znear;
		return this;
	}

	/**
	 * Floating-point distance to the far clipping plane. When defined, zfar must be greater than
	 * znear. If zfar is undefined, runtime must use infinite projection matrix.
	 */
	public getZFar(): number { return this._zfar; }

	/**
	 * Floating-point distance to the far clipping plane. When defined, zfar must be greater than
	 * znear. If zfar is undefined, runtime must use infinite projection matrix.
	 */
	public setZFar(zfar: number): this {
		this._zfar = zfar;
		return this;
	}

	/**********************************************************************************************
	 * Perspective.
	 */

	/**
	 * Floating-point aspect ratio of the field of view. When undefined, the aspect ratio of the
	 * canvas is used.
	 */
	public getAspectRatio(): number | null { return this._aspectRatio; }

	/**
	 * Floating-point aspect ratio of the field of view. When undefined, the aspect ratio of the
	 * canvas is used.
	 */
	public setAspectRatio(aspectRatio: number | null): this {
		this._aspectRatio = aspectRatio;
		return this;
	}

	/** Floating-point vertical field of view in radians. */
	public getYFov(): number { return this._yfov; }

	/** Floating-point vertical field of view in radians. */
	public setYFov(yfov: number): this {
		this._yfov = yfov;
		return this;
	}

	/**********************************************************************************************
	 * Orthographic.
	 */

	/**
	 * Floating-point horizontal magnification of the view, and half the view's width
	 * in world units.
	 */
	public getXMag(): number { return this._xmag; }

	/**
	 * Floating-point horizontal magnification of the view, and half the view's width
	 * in world units.
	 */
	public setXMag(xmag: number): this {
		this._xmag = xmag;
		return this;
	}

	/**
	 * Floating-point vertical magnification of the view, and half the view's height
	 * in world units.
	 */
	public getYMag(): number { return this._ymag; }

	/**
	 * Floating-point vertical magnification of the view, and half the view's height
	 * in world units.
	 */
	public setYMag(ymag: number): this {
		this._ymag = ymag;
		return this;
	}
}
