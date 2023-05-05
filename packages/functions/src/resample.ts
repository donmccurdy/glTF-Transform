import {
	Accessor,
	AnimationSampler,
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
	resample?: typeof resampleDebug;
	tolerance?: number;
}

const RESAMPLE_DEFAULTS: Required<ResampleOptions> = {
	ready: Promise.resolve(),
	resample: resampleDebug,
	tolerance: 1e-4,
};

/**
 * Resample {@link Animation}s, losslessly deduplicating keyframes to reduce file size. Duplicate
 * keyframes are commonly present in animation 'baked' by the authoring software to apply IK
 * constraints or other software-specific features. Based on THREE.KeyframeTrack.optimize().
 *
 * Result: (0,0,0,0,1,1,1,0,0,0,0,0,0,0) → (0,0,1,1,0,0)
 *
 * Example:
 *
 * ```
 * import { ready, resample } from 'keyframe-resample';
 *
 * // JavaScript (slower)
 * await document.transform(resample());
 *
 * // WebAssembly (faster)
 * await document.transform(resample({ ready, resample }));
 * ```
 */
export function resample(_options: ResampleOptions = RESAMPLE_DEFAULTS): Transform {
	const options = { ...RESAMPLE_DEFAULTS, ..._options } as Required<ResampleOptions>;

	return createTransform(NAME, async (document: Document, context?: TransformContext): Promise<void> => {
		const accessorsVisited = new Set<Accessor>();
		const srcAccessorCount = document.getRoot().listAccessors().length;
		const logger = document.getLogger();

		const ready = options.ready;
		const resample = options.resample;

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

					const times = toFloat32Array(input.getArray()!, input.getComponentType(), input.getNormalized());
					const values = toFloat32Array(output.getArray()!, input.getComponentType(), input.getNormalized());
					const elementSize = values.length / times.length;

					const srcCount = times.length;
					let dstCount: number;

					if (samplerInterpolation === 'STEP') {
						dstCount = resample(times, values, 'step', options.tolerance);
					} else if (samplerTargetPaths.get(sampler) === 'rotation') {
						dstCount = resample(times, values, 'slerp', options.tolerance);
					} else {
						dstCount = resample(times, values, 'lerp', options.tolerance);
					}

					if (dstCount < srcCount) {
						// Clone the input/output accessors, without cloning their underlying
						// arrays. Then assign the resampled data.
						const inputArray = input.getArray()!;
						const outputArray = output.getArray()!;
						input.setArray(EMPTY_ARRAY);
						output.setArray(EMPTY_ARRAY);
						sampler.setInput(input.clone().setArray(times.slice(0, dstCount)));
						sampler.setOutput(output.clone().setArray(values.slice(0, dstCount * elementSize)));
						input.setArray(inputArray);
						output.setArray(outputArray);
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

function toFloat32Array(
	srcArray: TypedArray,
	componentType: GLTF.AccessorComponentType,
	normalized: boolean
): Float32Array {
	const dstArray = new Float32Array(srcArray);
	if (!normalized) return dstArray;

	for (let i = 0; i < dstArray.length; i++) {
		dstArray[i] = MathUtils.decodeNormalizedInt(dstArray[i], componentType);
	}

	return dstArray;
}
