import { PropertyType } from '../constants';
import { GraphChild, Link } from '../graph';
import { GLTF } from '../types/gltf';
import { Accessor } from './accessor';
import { COPY_IDENTITY, Property } from './property';

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
 * 	.setType(GLTF.AccessorType.SCALAR);
 *
 * // Create accessor containing output values, in local units.
 * const output = doc.createAccessor('bounceValues')
 * 	.setArray(new Float32Array([
 * 		0, 0, 0, // y = 0
 * 		0, 1, 0, // y = 1
 * 		0, 0, 0, // y = 0
 * 	]))
 * 	.setType(GLTF.AccessorType.VEC3);
 *
 * // Create sampler.
 * const sampler = doc.createAnimationSampler('bounce')
 * 	.setInput(input)
 * 	.setOutput(output)
 * 	.setInterpolation(GLTF.AnimationSamplerInterpolation.LINEAR);
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
