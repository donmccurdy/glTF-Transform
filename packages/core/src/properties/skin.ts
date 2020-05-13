import { GraphChild, GraphChildList, Link } from '../graph';
import { Accessor } from './accessor';
import { Node } from './node';
import { Property } from './property';

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
export class Skin extends Property {
	@GraphChild skeleton: Link<Skin, Node> = null;
	@GraphChild inverseBindMatrices: Link<Skin, Accessor> = null;
	@GraphChildList joints: Link<Skin, Node>[] = [];

	/**
	 * {@link Node} used as a skeleton root. The node must be the closest common root of the joints
	 * hierarchy or a direct or indirect parent node of the closest common root.
	 */
	public getSkeleton(): Node {
		return this.skeleton ? this.skeleton.getChild() : null;
	}

	/**
	 * {@link Node} used as a skeleton root. The node must be the closest common root of the joints
	 * hierarchy or a direct or indirect parent node of the closest common root.
	 */
	public setSkeleton(skeleton: Node): this {
		this.skeleton = this._graph.link('skeleton', this, skeleton) as Link<Skin, Node>;
		return this;
	}

	/**
	 * {@link Accessor} containing the floating-point 4x4 inverse-bind matrices. The default is
	 * that each matrix is a 4x4 identity matrix, which implies that inverse-bind matrices were
	 * pre-applied.
	 */
	public getInverseBindMatrices(): Accessor {
		return this.inverseBindMatrices ? this.inverseBindMatrices.getChild() : null;
	}

	/**
	 * {@link Accessor} containing the floating-point 4x4 inverse-bind matrices. The default is
	 * that each matrix is a 4x4 identity matrix, which implies that inverse-bind matrices were
	 * pre-applied.
	 */
	public setInverseBindMatrices(inverseBindMatrices: Accessor): this {
		this.inverseBindMatrices = this._graph.link('inverseBindMatrices', this, inverseBindMatrices) as Link<Skin, Accessor>;
		return this;
	}

	/** Adds a joint {@link Node} to this {@link Skin}. */
	public addJoint(joint: Node): this {
		const link = this._graph.link('joint', this, joint) as Link<Skin, Node>;
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
