import { Nullable, PropertyType } from '../constants';
import { AnimationChannel } from './animation-channel';
import { AnimationSampler } from './animation-sampler';
import { ExtensibleProperty, IExtensibleProperty } from './extensible-property';
interface IAnimation extends IExtensibleProperty {
    channels: AnimationChannel[];
    samplers: AnimationSampler[];
}
/**
 * # Animation
 *
 * *Reusable collections of {@link AnimationChannel}s, together representing a discrete animation
 * clip.*
 *
 * One Animation represents one playable unit in an animation system. Each may contain channels
 * affecting multiple paths (`translation`, `rotation`, `scale`, or `weights`) on multiple
 * {@link Node}s. An Animation's channels must be played together, and do not have any meaning in
 * isolation.
 *
 * Multiple Animations _may_ be played together: for example, one character's _Walk_ animation
 * might play while another character's _Run_ animation plays. Or a single character might have
 * both an _Idle_ and a _Talk_ animation playing at the same time. However, glTF does not define
 * any particular relationship between top-level Animations, or any particular playback behavior
 * like looping or sequences of Animations. General-purpose viewers typically autoplay the first
 * animation and provide UI controls for choosing another. Game engines may have significantly
 * more advanced methods of playing and blending animations.
 *
 * For example, a very simple skinned {@link Mesh} might have two Animations, _Idle_ and _Walk_.
 * Each of those Animations might affect the rotations of two bones, _LegL_ and _LegR_, where the
 * keyframes for each target-path pair are stored in {@link AnimationChannel} instances. In  total,
 * this model would contain two Animations and Four {@link AnimationChannel}s.
 *
 * Usage:
 *
 * ```ts
 * const animation = doc.createAnimation('machineRun')
 * 	.addChannel(rotateCog1)
 * 	.addChannel(rotateCog2)
 * 	.addChannel(rotateCog3);
 * ```
 *
 * Reference
 * - [glTF → Animations](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#animations)
 */
export declare class Animation extends ExtensibleProperty<IAnimation> {
    propertyType: PropertyType.ANIMATION;
    protected init(): void;
    protected getDefaults(): Nullable<IAnimation>;
    /** Adds an {@link AnimationChannel} to this Animation. */
    addChannel(channel: AnimationChannel): this;
    /** Removes an {@link AnimationChannel} from this Animation. */
    removeChannel(channel: AnimationChannel): this;
    /** Lists {@link AnimationChannel}s in this Animation. */
    listChannels(): AnimationChannel[];
    /** Adds an {@link AnimationSampler} to this Animation. */
    addSampler(sampler: AnimationSampler): this;
    /** Removes an {@link AnimationSampler} from this Animation. */
    removeSampler(sampler: AnimationSampler): this;
    /** Lists {@link AnimationSampler}s in this Animation. */
    listSamplers(): AnimationSampler[];
}
export {};
