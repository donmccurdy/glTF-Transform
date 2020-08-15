import { PropertyType } from '../constants';
import { GraphChildList, Link } from '../graph';
import { AnimationChannel } from './animation-channel';
import { AnimationSampler } from './animation-sampler';
import { ExtensibleProperty } from './extensible-property';
import { COPY_IDENTITY } from './property';

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
export class Animation extends ExtensibleProperty {
	public readonly propertyType = PropertyType.ANIMATION;
	@GraphChildList private channels: Link<Animation, AnimationChannel>[] = [];
	@GraphChildList private samplers: Link<Animation, AnimationSampler>[] = [];

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this.clearGraphChildList(this.channels);
		this.clearGraphChildList(this.samplers);

		other.channels.forEach((link) => this.addChannel(resolve(link.getChild())));
		other.samplers.forEach((link) => this.addSampler(resolve(link.getChild())));

		return this;
	}

	/** Adds an {@link AnimationChannel} to this Animation. */
	public addChannel(channel: AnimationChannel): this {
		const link = this.graph.link('channel', this, channel);
		return this.addGraphChild(this.channels, link);
	}

	/** Removes an {@link AnimationChannel} from this Animation. */
	public removeChannel(channel: AnimationChannel): this {
		return this.removeGraphChild(this.channels, channel);
	}

	/** Lists {@link AnimationChannel}s in this Animation. */
	public listChannels(): AnimationChannel[] {
		return this.channels.map((link) => link.getChild());
	}

	/** Adds an {@link AnimationSampler} to this Animation. */
	public addSampler(sampler: AnimationSampler): this {
		const link = this.graph.link('sampler', this, sampler);
		return this.addGraphChild(this.samplers, link);
	}

	/** Removes an {@link AnimationSampler} from this Animation. */
	public removeSampler(sampler: AnimationSampler): this {
		return this.removeGraphChild(this.samplers, sampler);
	}

	/** Lists {@link AnimationSampler}s in this Animation. */
	public listSamplers(): AnimationSampler[] {
		return this.samplers.map((link) => link.getChild());
	}
}
