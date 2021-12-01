import { Nullable, PropertyType } from '../constants';
import { GraphChild, Link } from '../graph';
import { GLTF } from '../types/gltf';
import { Accessor } from './accessor';
import { COPY_IDENTITY, Property } from './property';

interface IAnimationSampler {
	interpolation: GLTF.AnimationSamplerInterpolation;
	input: Accessor;
	output: Accessor;
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
 * in<sub>1</sub>, value<sub>1</sub>, out<sub>1</sub>,
 * in<sub>2</sub>, value<sub>2</sub>, out<sub>2</sub>,
 * in<sub>3</sub>, value<sub>3</sub>, out<sub>3</sub>, ...
 *
 * Usage:
 *
 * ```ts
 * // Create accessor containing input times, in seconds.
 * const input = doc.createAccessor('bounceTimes')
 * 	.setArray(new Float32Array([0, 1, 2]))
 * 	.setType(Accessor.Type.SCALAR);
 *
 * // Create accessor containing output values, in local units.
 * const output = doc.createAccessor('bounceValues')
 * 	.setArray(new Float32Array([
 * 		0, 0, 0, // y = 0
 * 		0, 1, 0, // y = 1
 * 		0, 0, 0, // y = 0
 * 	]))
 * 	.setType(Accessor.Type.VEC3);
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
export class AnimationSampler extends Property<IAnimationSampler> {
	public readonly propertyType = PropertyType.ANIMATION_SAMPLER;

	/**********************************************************************************************
	 * Constants.
	 */

	/** Interpolation method. */
	public static Interpolation: Record<string, GLTF.AnimationSamplerInterpolation> = {
		/** Animated values are linearly interpolated between keyframes. */
		LINEAR: 'LINEAR',
		/** Animated values remain constant from one keyframe until the next keyframe. */
		STEP: 'STEP',
		/** Animated values are interpolated according to given cubic spline tangents. */
		CUBICSPLINE: 'CUBICSPLINE',
	};

	/**********************************************************************************************
	 * Instance.
	 */

	protected getDefaultAttributes(): Nullable<IAnimationSampler> {
		return { interpolation: AnimationSampler.Interpolation.LINEAR, input: null, output: null };
	}

	/**********************************************************************************************
	 * Static.
	 */

	/** Interpolation mode: `STEP`, `LINEAR`, or `CUBICSPLINE`. */
	public getInterpolation(): GLTF.AnimationSamplerInterpolation {
		return this.get('interpolation');
	}

	/** Interpolation mode: `STEP`, `LINEAR`, or `CUBICSPLINE`. */
	public setInterpolation(interpolation: GLTF.AnimationSamplerInterpolation): this {
		return this.set('interpolation', interpolation);
	}

	/** Times for each keyframe, in seconds. */
	public getInput(): Accessor | null {
		return this.getRef('input');
	}

	/** Times for each keyframe, in seconds. */
	public setInput(input: Accessor | null): this {
		return this.setRef('input', input);
	}

	/**
	 * Values for each keyframe. For `CUBICSPLINE` interpolation, output also contains in/out
	 * tangents.
	 */
	public getOutput(): Accessor | null {
		return this.getRef('output');
	}

	/**
	 * Values for each keyframe. For `CUBICSPLINE` interpolation, output also contains in/out
	 * tangents.
	 */
	public setOutput(output: Accessor | null): this {
		return this.setRef('output', output);
	}
}
