import { Nullable, PropertyType } from '../constants';
import { Accessor } from './accessor';
import { ExtensibleProperty, IExtensibleProperty } from './extensible-property';
import { Node } from './node';
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
 * - [glTF → Skins](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#skins)
 *
 * @category Properties
 */
export declare class Skin extends ExtensibleProperty<ISkin> {
    propertyType: PropertyType.SKIN;
    protected init(): void;
    protected getDefaults(): Nullable<ISkin>;
    /**
     * {@link Node} used as a skeleton root. The node must be the closest common root of the joints
     * hierarchy or a direct or indirect parent node of the closest common root.
     */
    getSkeleton(): Node | null;
    /**
     * {@link Node} used as a skeleton root. The node must be the closest common root of the joints
     * hierarchy or a direct or indirect parent node of the closest common root.
     */
    setSkeleton(skeleton: Node | null): this;
    /**
     * {@link Accessor} containing the floating-point 4x4 inverse-bind matrices. The default is
     * that each matrix is a 4x4 identity matrix, which implies that inverse-bind matrices were
     * pre-applied.
     */
    getInverseBindMatrices(): Accessor | null;
    /**
     * {@link Accessor} containing the floating-point 4x4 inverse-bind matrices. The default is
     * that each matrix is a 4x4 identity matrix, which implies that inverse-bind matrices were
     * pre-applied.
     */
    setInverseBindMatrices(inverseBindMatrices: Accessor | null): this;
    /** Adds a joint {@link Node} to this {@link Skin}. */
    addJoint(joint: Node): this;
    /** Removes a joint {@link Node} from this {@link Skin}. */
    removeJoint(joint: Node): this;
    /** Lists joints ({@link Node}s used as joints or bones) in this {@link Skin}. */
    listJoints(): Node[];
}
export {};
