import { PropertyType } from '../constants';
import { GraphChild, GraphChildList, Link } from '../graph';
import { Accessor } from './accessor';
import { ExtensibleProperty } from './extensible-property';
import { Node } from './node';
import { COPY_IDENTITY } from './property';

/**
 * # Skin
 *
 * *Collection of {@link Node} joints and inverse bind matrices used with skinned {@link Mesh}
 * instances.*
 *
 * Reference
 * - [glTF → Skins](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#skins)
 *
 * @category Properties
 */
export class Skin extends ExtensibleProperty {
	public readonly propertyType = PropertyType.SKIN;

	@GraphChild private skeleton: Link<Skin, Node> | null = null;
	@GraphChild private inverseBindMatrices: Link<Skin, Accessor> | null = null;
	@GraphChildList private joints: Link<Skin, Node>[] = [];

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this.setSkeleton(other.skeleton ? resolve(other.skeleton.getChild()) : null);
		this.setInverseBindMatrices(
			other.inverseBindMatrices ? resolve(other.inverseBindMatrices.getChild()) : null
		);

		this.clearGraphChildList(this.joints);
		other.joints.forEach((link) => this.addJoint(resolve(link.getChild())));

		return this;
	}

	/**
	 * {@link Node} used as a skeleton root. The node must be the closest common root of the joints
	 * hierarchy or a direct or indirect parent node of the closest common root.
	 */
	public getSkeleton(): Node | null {
		return this.skeleton ? this.skeleton.getChild() : null;
	}

	/**
	 * {@link Node} used as a skeleton root. The node must be the closest common root of the joints
	 * hierarchy or a direct or indirect parent node of the closest common root.
	 */
	public setSkeleton(skeleton: Node | null): this {
		this.skeleton = this.graph.link('skeleton', this, skeleton);
		return this;
	}

	/**
	 * {@link Accessor} containing the floating-point 4x4 inverse-bind matrices. The default is
	 * that each matrix is a 4x4 identity matrix, which implies that inverse-bind matrices were
	 * pre-applied.
	 */
	public getInverseBindMatrices(): Accessor | null {
		return this.inverseBindMatrices ? this.inverseBindMatrices.getChild() : null;
	}

	/**
	 * {@link Accessor} containing the floating-point 4x4 inverse-bind matrices. The default is
	 * that each matrix is a 4x4 identity matrix, which implies that inverse-bind matrices were
	 * pre-applied.
	 */
	public setInverseBindMatrices(inverseBindMatrices: Accessor | null): this {
		this.inverseBindMatrices
			= this.graph.link('inverseBindMatrices', this, inverseBindMatrices);
		return this;
	}

	/** Adds a joint {@link Node} to this {@link Skin}. */
	public addJoint(joint: Node): this {
		const link = this.graph.link('joint', this, joint);
		return this.addGraphChild(this.joints, link);
	}

	/** Removes a joint {@link Node} from this {@link Skin}. */
	public removeJoint(joint: Node): this {
		return this.removeGraphChild(this.joints, joint);
	}

	/** Lists joints ({@link Node}s used as joints or bones) in this {@link Skin}. */
	public listJoints(): Node[] {
		return this.joints.map((link) => link.getChild());
	}
}
