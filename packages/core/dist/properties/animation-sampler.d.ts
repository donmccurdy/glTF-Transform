import { Nullable, PropertyType } from '../constants';
import { GLTF } from '../types/gltf';
import { Accessor } from './accessor';
import { ExtensibleProperty, IExtensibleProperty } from './extensible-property';
interface IAnimationSampler extends IExtensibleProperty {
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
export declare class AnimationSampler extends ExtensibleProperty<IAnimationSampler> {
    propertyType: PropertyType.ANIMATION_SAMPLER;
    /**********************************************************************************************
     * Constants.
     */
    /** Interpolation method. */
    static Interpolation: Record<string, GLTF.AnimationSamplerInterpolation>;
    /**********************************************************************************************
     * Instance.
     */
    protected init(): void;
    protected getDefaultAttributes(): Nullable<IAnimationSampler>;
    /**********************************************************************************************
     * Static.
     */
    /** Interpolation mode: `STEP`, `LINEAR`, or `CUBICSPLINE`. */
    getInterpolation(): GLTF.AnimationSamplerInterpolation;
    /** Interpolation mode: `STEP`, `LINEAR`, or `CUBICSPLINE`. */
    setInterpolation(interpolation: GLTF.AnimationSamplerInterpolation): this;
    /** Times for each keyframe, in seconds. */
    getInput(): Accessor | null;
    /** Times for each keyframe, in seconds. */
    setInput(input: Accessor | null): this;
    /**
     * Values for each keyframe. For `CUBICSPLINE` interpolation, output also contains in/out
     * tangents.
     */
    getOutput(): Accessor | null;
    /**
     * Values for each keyframe. For `CUBICSPLINE` interpolation, output also contains in/out
     * tangents.
     */
    setOutput(output: Accessor | null): this;
}
export {};
