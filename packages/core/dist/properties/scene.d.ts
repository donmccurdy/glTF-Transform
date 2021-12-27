import { Nullable, PropertyType } from '../constants';
import { ExtensibleProperty, IExtensibleProperty } from './extensible-property';
import { Node } from './node';
interface IScene extends IExtensibleProperty {
    children: Node[];
}
/**
 * # Scene
 *
 * *Scenes represent a set of visual objects to render.*
 *
 * Typically a glTF file contains only a single scene, although more are allowed and useful in some
 * cases. No particular meaning is associated with additional scenes, except as defined by the
 * application. Scenes reference {@link Node}s, and a single node cannot be a member of more than
 * one scene.
 *
 * References:
 * - [glTF → Scenes](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#scenes)
 * - [glTF → Coordinate System and Units](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#coordinate-system-and-units)
 *
 * @category Properties
 */
export declare class Scene extends ExtensibleProperty<IScene> {
    propertyType: PropertyType.SCENE;
    protected init(): void;
    protected getDefaults(): Nullable<IScene>;
    copy(other: this, resolve?: <T extends import("./property").Property<import("./property").IProperty>>(t: T) => T): this;
    /** Adds a {@link Node} to the scene. */
    addChild(node: Node): this;
    /** Removes a {@link Node} from the scene. */
    removeChild(node: Node): this;
    /** Lists all root {@link Node}s in the scene. */
    listChildren(): Node[];
    /** Visits each {@link Node} in the scene, including descendants, top-down. */
    traverse(fn: (node: Node) => void): this;
}
export {};
