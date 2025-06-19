import { type Nullable, PropertyType } from '../constants.js';
import type { GLTF } from '../types/gltf.js';
import { ExtensibleProperty, type IExtensibleProperty } from './extensible-property.js';

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
 * - [glTF → Cameras](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#cameras)
 *
 * @category Properties
 */
export class Camera extends ExtensibleProperty<ICamera> {
	public declare propertyType: PropertyType.CAMERA;

	/**********************************************************************************************
	 * Constants.
	 */

	public static Type: Record<string, GLTF.CameraType> = {
		/** A perspective camera representing a perspective projection matrix. */
		PERSPECTIVE: 'perspective',
		/** An orthographic camera representing an orthographic projection matrix. */
		ORTHOGRAPHIC: 'orthographic',
	};

	/**********************************************************************************************
	 * Instance.
	 */

	protected init(): void {
		this.propertyType = PropertyType.CAMERA;
	}

	protected getDefaults(): Nullable<ICamera> {
		return Object.assign(super.getDefaults() as IExtensibleProperty, {
			// Common.
			type: Camera.Type.PERSPECTIVE,
			znear: 0.1,
			zfar: 100,
			// Perspective.
			aspectRatio: null,
			yfov: (Math.PI * 2 * 50) / 360, // 50º
			// Orthographic.
			xmag: 1,
			ymag: 1,
		});
	}

	/**********************************************************************************************
	 * Common.
	 */

	/** Specifies if the camera uses a perspective or orthographic projection. */
	public getType(): GLTF.CameraType {
		return this.get('type');
	}

	/** Specifies if the camera uses a perspective or orthographic projection. */
	public setType(type: GLTF.CameraType): this {
		return this.set('type', type);
	}

	/** Floating-point distance to the near clipping plane. */
	public getZNear(): number {
		return this.get('znear');
	}

	/** Floating-point distance to the near clipping plane. */
	public setZNear(znear: number): this {
		return this.set('znear', znear);
	}

	/**
	 * Floating-point distance to the far clipping plane. When defined, zfar must be greater than
	 * znear. If zfar is undefined, runtime must use infinite projection matrix.
	 */
	public getZFar(): number {
		return this.get('zfar');
	}

	/**
	 * Floating-point distance to the far clipping plane. When defined, zfar must be greater than
	 * znear. If zfar is undefined, runtime must use infinite projection matrix.
	 */
	public setZFar(zfar: number): this {
		return this.set('zfar', zfar);
	}

	/**********************************************************************************************
	 * Perspective.
	 */

	/**
	 * Floating-point aspect ratio of the field of view. When undefined, the aspect ratio of the
	 * canvas is used.
	 */
	public getAspectRatio(): number | null {
		return this.get('aspectRatio');
	}

	/**
	 * Floating-point aspect ratio of the field of view. When undefined, the aspect ratio of the
	 * canvas is used.
	 */
	public setAspectRatio(aspectRatio: number | null): this {
		return this.set('aspectRatio', aspectRatio);
	}

	/** Floating-point vertical field of view in radians. */
	public getYFov(): number {
		return this.get('yfov');
	}

	/** Floating-point vertical field of view in radians. */
	public setYFov(yfov: number): this {
		return this.set('yfov', yfov);
	}

	/**********************************************************************************************
	 * Orthographic.
	 */

	/**
	 * Floating-point horizontal magnification of the view, and half the view's width
	 * in world units.
	 */
	public getXMag(): number {
		return this.get('xmag');
	}

	/**
	 * Floating-point horizontal magnification of the view, and half the view's width
	 * in world units.
	 */
	public setXMag(xmag: number): this {
		return this.set('xmag', xmag);
	}

	/**
	 * Floating-point vertical magnification of the view, and half the view's height
	 * in world units.
	 */
	public getYMag(): number {
		return this.get('ymag');
	}

	/**
	 * Floating-point vertical magnification of the view, and half the view's height
	 * in world units.
	 */
	public setYMag(ymag: number): this {
		return this.set('ymag', ymag);
	}
}
