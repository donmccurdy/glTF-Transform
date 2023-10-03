import {
	Accessor,
	AnimationSampler,
	ComponentTypeToTypedArray,
	Document,
	GLTF,
	MathUtils,
	PropertyType,
	Root,
	Transform,
	TransformContext,
	TypedArray,
} from '@gltf-transform/core';
import { dedup } from './dedup.js';
import { createTransform, isTransformPending } from './utils.js';
import { resampleDebug } from 'keyframe-resample';

const NAME = 'resample';

const EMPTY_ARRAY = new Float32Array(0);

export interface ResampleOptions {
	ready?: Promise<void>;
	resample?: unknown; // glTF-Transform/issues/996
	tolerance?: number;
}

const RESAMPLE_DEFAULTS: Required<ResampleOptions> = {
	ready: Promise.resolve(),
	resample: resampleDebug,
	tolerance: 1e-4,
};

/**
 * Resample {@link AnimationChannel AnimationChannels}, losslessly deduplicating keyframes to
 * reduce file size. Duplicate keyframes are commonly present in animation 'baked' by the
 * authoring software to apply IK constraints or other software-specific features.
 *
 * Optionally, a WebAssembly implementation from the
 * [`keyframe-resample`](https://github.com/donmccurdy/keyframe-resample-wasm) library may be
 * provided. The WebAssembly version is usually much faster at processing large animation
 * sequences, but may not be compatible with all runtimes and JavaScript build tools.
 *
 * Result: (0,0,0,0,1,1,1,0,0,0,0,0,0,0) → (0,0,1,1,0,0)
 *
 * Example:
 *
 * ```
 * import { resample } from '@gltf-transform/functions';
 * import { ready, resample as resampleWASM } from 'keyframe-resample';
 *
 * // JavaScript (slower)
 * await document.transform(resample());
 *
 * // WebAssembly (faster)
 * await document.transform(resample({ ready, resample: resampleWASM }));
 * ```
 *
 * @privateRemarks Implementation based on THREE.KeyframeTrack#optimize().
 * @category Transforms
 */
export function resample(_options: ResampleOptions = RESAMPLE_DEFAULTS): Transform {
	const options = { ...RESAMPLE_DEFAULTS, ..._options } as Required<ResampleOptions>;

	return createTransform(NAME, async (document: Document, context?: TransformContext): Promise<void> => {
		const accessorsVisited = new Set<Accessor>();
		const srcAccessorCount = document.getRoot().listAccessors().length;
		const logger = document.getLogger();

		const ready = options.ready;
		const resample = options.resample as typeof resampleDebug;

		await ready;

		for (const animation of document.getRoot().listAnimations()) {
			const samplerTargetPaths = new Map<AnimationSampler, GLTF.AnimationChannelTargetPath>();
			for (const channel of animation.listChannels()) {
				samplerTargetPaths.set(channel.getSampler()!, channel.getTargetPath()!);
			}

			for (const sampler of animation.listSamplers()) {
				const samplerInterpolation = sampler.getInterpolation();

				if (samplerInterpolation === 'STEP' || samplerInterpolation === 'LINEAR') {
					const input = sampler.getInput()!;
					const output = sampler.getOutput()!;

					accessorsVisited.add(input);
					accessorsVisited.add(output);

					// prettier-ignore
					const tmpTimes = toFloat32Array(
						input.getArray()!,
						input.getComponentType(),
						input.getNormalized()
					);
					const tmpValues = toFloat32Array(
						output.getArray()!,
						output.getComponentType(),
						output.getNormalized(),
					);

					const elementSize = tmpValues.length / tmpTimes.length;
					const srcCount = tmpTimes.length;
					let dstCount: number;

					if (samplerInterpolation === 'STEP') {
						dstCount = resample(tmpTimes, tmpValues, 'step', options.tolerance);
					} else if (samplerTargetPaths.get(sampler) === 'rotation') {
						dstCount = resample(tmpTimes, tmpValues, 'slerp', options.tolerance);
					} else {
						dstCount = resample(tmpTimes, tmpValues, 'lerp', options.tolerance);
					}

					if (dstCount < srcCount) {
						// Clone the input/output accessors, without cloning their underlying
						// arrays. Then assign the resampled data.
						const srcTimes = input.getArray()!;
						const srcValues = output.getArray()!;

						const dstTimes = fromFloat32Array(
							new Float32Array(tmpTimes.buffer, tmpTimes.byteOffset, dstCount),
							input.getComponentType(),
							input.getNormalized(),
						);
						const dstValues = fromFloat32Array(
							new Float32Array(tmpValues.buffer, tmpValues.byteOffset, dstCount * elementSize),
							output.getComponentType(),
							output.getNormalized(),
						);

						input.setArray(EMPTY_ARRAY);
						output.setArray(EMPTY_ARRAY);

						sampler.setInput(input.clone().setArray(dstTimes));
						sampler.setOutput(output.clone().setArray(dstValues));

						input.setArray(srcTimes);
						output.setArray(srcValues);
					}
				}
			}
		}

		for (const accessor of Array.from(accessorsVisited.values())) {
			const used = accessor.listParents().some((p) => !(p instanceof Root));
			if (!used) accessor.dispose();
		}

		// Resampling may result in duplicate input or output sampler
		// accessors. Find and remove the duplicates after processing.
		const dstAccessorCount = document.getRoot().listAccessors().length;
		if (dstAccessorCount > srcAccessorCount && !isTransformPending(context, NAME, 'dedup')) {
			await document.transform(dedup({ propertyTypes: [PropertyType.ACCESSOR] }));
		}

		logger.debug(`${NAME}: Complete.`);
	});
}

/** Returns a copy of the source array, as a denormalized Float32Array. */
function toFloat32Array(
	srcArray: TypedArray,
	componentType: GLTF.AccessorComponentType,
	normalized: boolean,
): Float32Array {
	if (srcArray instanceof Float32Array) return srcArray.slice();
	const dstArray = new Float32Array(srcArray);
	if (!normalized) return dstArray;

	for (let i = 0; i < dstArray.length; i++) {
		dstArray[i] = MathUtils.decodeNormalizedInt(dstArray[i], componentType);
	}

	return dstArray;
}

/** Returns a copy of the source array, with specified component type and normalization. */
function fromFloat32Array(
	srcArray: Float32Array,
	componentType: GLTF.AccessorComponentType,
	normalized: boolean,
): TypedArray {
	if (componentType === Accessor.ComponentType.FLOAT) return srcArray.slice();
	const TypedArray = ComponentTypeToTypedArray[componentType];
	const dstArray = new TypedArray(srcArray.length);

	for (let i = 0; i < dstArray.length; i++) {
		dstArray[i] = normalized ? MathUtils.encodeNormalizedInt(srcArray[i], componentType) : srcArray[i];
	}

	return dstArray;
}
