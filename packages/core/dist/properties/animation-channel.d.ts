import { Nullable, PropertyType } from '../constants';
import { GLTF } from '../types/gltf';
import { AnimationSampler } from './animation-sampler';
import { ExtensibleProperty, IExtensibleProperty } from './extensible-property';
import { Node } from './node';
interface IAnimationChannel extends IExtensibleProperty {
    targetPath: GLTF.AnimationChannelTargetPath | null;
    targetNode: Node;
    sampler: AnimationSampler;
}
/**
 * # AnimationChannel
 *
 * *A target-path pair within a larger {@link Animation}, which refers to an
 * {@link AnimationSampler} storing the keyframe data for that pair.*
 *
 * A _target_ is always a {@link Node}, in the core glTF spec. A _path_ is any property of that
 * Node that can be affected by animation: `translation`, `rotation`, `scale`, or `weights`. An
 * {@link Animation} affecting the positions and rotations of several {@link Node}s would contain
 * one channel for each Node-position or Node-rotation pair. The keyframe data for an
 * AnimationChannel is stored in an {@link AnimationSampler}, which must be attached to the same
 * {@link Animation}.
 *
 * Usage:
 *
 * ```ts
 * const node = doc.getRoot()
 * 	.listNodes()
 * 	.find((node) => node.getName() === 'Cog');
 *
 * const channel = doc.createAnimationChannel('cogRotation')
 * 	.setTargetPath('rotation')
 * 	.setTargetNode(node)
 * 	.setSampler(rotateSampler);
 * ```
 *
 * Reference
 * - [glTF → Animations](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#animations)
 */
export declare class AnimationChannel extends ExtensibleProperty<IAnimationChannel> {
    propertyType: PropertyType.ANIMATION_CHANNEL;
    /**********************************************************************************************
     * Constants.
     */
    /** Name of the property to be modified by an animation channel. */
    static TargetPath: Record<string, GLTF.AnimationChannelTargetPath>;
    /**********************************************************************************************
     * Instance.
     */
    protected init(): void;
    protected getDefaults(): Nullable<IAnimationChannel>;
    /**********************************************************************************************
     * Properties.
     */
    /**
     * Path (property) animated on the target {@link Node}. Supported values include:
     * `translation`, `rotation`, `scale`, or `weights`.
     */
    getTargetPath(): GLTF.AnimationChannelTargetPath | null;
    /**
     * Path (property) animated on the target {@link Node}. Supported values include:
     * `translation`, `rotation`, `scale`, or `weights`.
     */
    setTargetPath(targetPath: GLTF.AnimationChannelTargetPath): this;
    /** Target {@link Node} animated by the channel. */
    getTargetNode(): Node | null;
    /** Target {@link Node} animated by the channel. */
    setTargetNode(targetNode: Node | null): this;
    /**
     * Keyframe data input/output values for the channel. Must be attached to the same
     * {@link Animation}.
     */
    getSampler(): AnimationSampler | null;
    /**
     * Keyframe data input/output values for the channel. Must be attached to the same
     * {@link Animation}.
     */
    setSampler(sampler: AnimationSampler | null): this;
}
export {};
