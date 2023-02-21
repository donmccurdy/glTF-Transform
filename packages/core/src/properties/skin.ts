import { BufferViewUsage, Nullable, PropertyType } from '../constants.js';
import type { Accessor } from './accessor.js';
import { ExtensibleProperty, IExtensibleProperty } from './extensible-property.js';
import type { Node } from './node.js';

interface ISkin extends IExtensibleProperty {
	skeleton: Node;
	inverseBindMatrices: Accessor;
	joints: Node[];
}

/**
 * # Skin
 *
 * *Collection of {@link Node} joints and inverse bind matrices used with skinned {@link Mesh}
 * instances.*
 *
 * Reference
 * - [glTF → Skins](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#skins)
 *
 * @category Properties
 */
export class Skin extends ExtensibleProperty<ISkin> {
	public declare propertyType: PropertyType.SKIN;

	protected init(): void {
		this.propertyType = PropertyType.SKIN;
	}

	protected getDefaults(): Nullable<ISkin> {
		return Object.assign(super.getDefaults() as IExtensibleProperty, {
			skeleton: null,
			inverseBindMatrices: null,
			joints: [],
		});
	}

	/**
	 * {@link Node} used as a skeleton root. The node must be the closest common root of the joints
	 * hierarchy or a direct or indirect parent node of the closest common root.
	 */
	public getSkeleton(): Node | null {
		return this.getRef('skeleton');
	}

	/**
	 * {@link Node} used as a skeleton root. The node must be the closest common root of the joints
	 * hierarchy or a direct or indirect parent node of the closest common root.
	 */
	public setSkeleton(skeleton: Node | null): this {
		return this.setRef('skeleton', skeleton);
	}

	/**
	 * {@link Accessor} containing the floating-point 4x4 inverse-bind matrices. The default is
	 * that each matrix is a 4x4 identity matrix, which implies that inverse-bind matrices were
	 * pre-applied.
	 */
	public getInverseBindMatrices(): Accessor | null {
		return this.getRef('inverseBindMatrices');
	}

	/**
	 * {@link Accessor} containing the floating-point 4x4 inverse-bind matrices. The default is
	 * that each matrix is a 4x4 identity matrix, which implies that inverse-bind matrices were
	 * pre-applied.
	 */
	public setInverseBindMatrices(inverseBindMatrices: Accessor | null): this {
		return this.setRef('inverseBindMatrices', inverseBindMatrices, {
			usage: BufferViewUsage.INVERSE_BIND_MATRICES,
		});
	}

	/** Adds a joint {@link Node} to this {@link Skin}. */
	public addJoint(joint: Node): this {
		return this.addRef('joints', joint);
	}

	/** Removes a joint {@link Node} from this {@link Skin}. */
	public removeJoint(joint: Node): this {
		return this.removeRef('joints', joint);
	}

	/** Lists joints ({@link Node}s used as joints or bones) in this {@link Skin}. */
	public listJoints(): Node[] {
		return this.listRefs('joints');
	}
}
