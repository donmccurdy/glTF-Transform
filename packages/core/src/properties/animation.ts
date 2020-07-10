import { PropertyType } from '../constants';
import { GraphChild, GraphChildList, Link } from '../graph';
import { Accessor } from './accessor';
import { ExtensibleProperty } from './extensible-property';
import { Node } from './node';
import { COPY_IDENTITY, Property } from './property';

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

/**
 * # AnimationChannel
 *
 * *A target-path pair within a larger {@link Animation}, which refers to an
 * {@link AnimationSampler} storing the keyframe data for that pair.*
 *
 * A _target_ is always a {@link Node}, in the core glTF spec. A _path_ is any property of that
 * Node that can be affected by animation: `translation`, `rotation`, `scale`, or `weights`. An
 * {@link Animation} affecting the positions and rotations of several {@link Node}s would contain one
 * channel for each Node-position or Node-rotation pair. The keyframe data for an AnimationChannel
 * is stored in an {@link AnimationSampler}, which must be attached to the same {@link Animation}.
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
export class AnimationChannel extends Property {
	public readonly propertyType = PropertyType.ANIMATION_CHANNEL;
	private _targetPath: GLTF.AnimationChannelTargetPath = null;
	@GraphChild private targetNode: Link<AnimationChannel, Node> = null;
	@GraphChild private sampler: Link<AnimationChannel, AnimationSampler> = null;

	/**
	 * Path (property) animated on the target {@link Node}. Supported values include:
	 * `translation`, `rotation`, `scale`, or `weights`.
	 */
	public getTargetPath(): GLTF.AnimationChannelTargetPath {
		return this._targetPath;
	}

	/**
	 * Path (property) animated on the target {@link Node}. Supported values include:
	 * `translation`, `rotation`, `scale`, or `weights`.
	 */
	public setTargetPath(targetPath: GLTF.AnimationChannelTargetPath): this {
		this._targetPath = targetPath;
		return this;
	}

	/** Target {@link Node} animated by the channel. */
	public getTargetNode(): Node {
		return this.targetNode ? this.targetNode.getChild() : null;
	}

	/** Target {@link Node} animated by the channel. */
	public setTargetNode(targetNode: Node): this {
		this.targetNode = this.graph.link('target.node', this, targetNode);
		return this;
	}

	/**
	 * Keyframe data input/output values for the channel. Must be attached to the same
	 * {@link Animation}.
	 */
	public getSampler(): AnimationSampler {
		return this.sampler ? this.sampler.getChild() : null;
	}

	/**
	 * Keyframe data input/output values for the channel. Must be attached to the same
	 * {@link Animation}.
	 */
	public setSampler(sampler: AnimationSampler): this {
		this.sampler = this.graph.link('sampler', this, sampler);
		return this;
	}
}

/**
 * # AnimationSampler
 *
 * *Reusable collection of keyframes affecting particular property of an object.*
 *
 * Each AnimationSampler refers to an input and an output {@link Accessor}. Input contains times
 * (in seconds) for each keyframe. Output contains values (of any {@link Accessor.Type}) for the
 * animated property at each keyframe. Samplers using `CUBICSPLINE` interpolation will also contain
 * in/out tangents in the output, with the layout:
 *
 * in<sub>1</sub>, value<sub>1</sub>, out<sub>1</sub>, in<sub>2</sub>, value<sub>2</sub>, out<sub>2</sub>,
 * in<sub>3</sub>, value<sub>3</sub>, out<sub>3</sub>, ...
 *
 * Usage:
 *
 * ```ts
 * // Create accessor containing input times, in seconds.
 * const input = doc.createAccessor('bounceTimes')
 * 	.setArray(new Float32Array([0, 1, 2]))
 * 	.setType('SCALAR');
 *
 * // Create accessor containing output values, in local units.
 * const output = doc.createAccessor('bounceValues')
 * 	.setArray(new Float32Array([
 * 		0, 0, 0, // y = 0
 * 		0, 1, 0, // y = 1
 * 		0, 0, 0, // y = 0
 * 	]))
 * 	.setType('VEC3');
 *
 * // Create sampler.
 * const sampler = doc.createAnimationSampler('bounce')
 * 	.setInput(input)
 * 	.setOutput(output)
 * 	.setInterpolation('LINEAR');
 * ```
 *
 * Reference
 * - [glTF → Animations](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#animations)
 */
export class AnimationSampler extends Property {
	public readonly propertyType = PropertyType.ANIMATION_SAMPLER;

	private _interpolation: GLTF.AnimationSamplerInterpolation = GLTF.AnimationSamplerInterpolation.LINEAR;

	@GraphChild private input: Link<AnimationSampler, Accessor> = null;
	@GraphChild private output: Link<AnimationSampler, Accessor> = null;

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this._interpolation = other._interpolation;

		if (other.input) this.setInput(resolve(other.input.getChild()));
		if (other.output) this.setOutput(resolve(other.output.getChild()));

		return this;
	}

	/** Interpolation mode: `STEP`, `LINEAR`, or `CUBICSPLINE`. */
	public getInterpolation(): GLTF.AnimationSamplerInterpolation {
		return this._interpolation;
	}

	/** Interpolation mode: `STEP`, `LINEAR`, or `CUBICSPLINE`. */
	public setInterpolation(interpolation: GLTF.AnimationSamplerInterpolation): this {
		this._interpolation = interpolation;
		return this;
	}

	/** Times for each keyframe, in seconds. */
	public getInput(): Accessor {
		return this.input ? this.input.getChild() : null;
	}

	/** Times for each keyframe, in seconds. */
	public setInput(input: Accessor): this {
		this.input = this.graph.link('input', this, input);
		return this;
	}

	/**
	 * Values for each keyframe. For `CUBICSPLINE` interpolation, output also contains in/out
	 * tangents.
	 */
	public getOutput(): Accessor {
		return this.output ? this.output.getChild() : null;
	}

	/**
	 * Values for each keyframe. For `CUBICSPLINE` interpolation, output also contains in/out
	 * tangents.
	 */
	public setOutput(output: Accessor): this {
		this.output = this.graph.link('output', this, output);
		return this;
	}
}
