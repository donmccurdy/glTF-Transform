import {
	Accessor,
	AnimationSampler,
	Document,
	GLTF,
	PropertyType,
	Root,
	Transform,
	TransformContext,
} from '@gltf-transform/core';
import { dedup } from './dedup.js';
import { createTransform, isTransformPending } from './utils.js';
import { ready, resampleWASM } from 'keyframe-resample';

const NAME = 'resample';

export interface ResampleOptions {
	tolerance?: number;
}

const RESAMPLE_DEFAULTS: Required<ResampleOptions> = { tolerance: 1e-4 };

/**
 * Resample {@link Animation}s, losslessly deduplicating keyframes to reduce file size. Duplicate
 * keyframes are commonly present in animation 'baked' by the authoring software to apply IK
 * constraints or other software-specific features. Based on THREE.KeyframeTrack.optimize().
 *
 * Example: (0,0,0,0,1,1,1,0,0,0,0,0,0,0) --> (0,0,1,1,0,0)
 */
export function resample(_options: ResampleOptions = RESAMPLE_DEFAULTS): Transform {
	const options = { ...RESAMPLE_DEFAULTS, ..._options } as Required<ResampleOptions>;

	return createTransform(NAME, async (document: Document, context?: TransformContext): Promise<void> => {
		const accessorsVisited = new Set<Accessor>();
		const srcAccessorCount = document.getRoot().listAccessors().length;
		const logger = document.getLogger();

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

					const times = input.getArray()!.slice() as Float32Array; // TODO(cleanup)
					const values = output.getArray()!.slice() as Float32Array; // TODO(cleanup)
					const elementSize = values.length / times.length;

					const srcCount = times.length;
					let dstCount: number;

					if (samplerInterpolation === 'STEP') {
						dstCount = resampleWASM(times, values, 'step', options.tolerance);
					} else if (samplerTargetPaths.get(sampler) === 'rotation') {
						dstCount = resampleWASM(times, values, 'slerp', options.tolerance);
					} else {
						dstCount = resampleWASM(times, values, 'lerp', options.tolerance);
					}

					if (dstCount < srcCount) {
						sampler.setInput(input.clone().setArray(times.slice(0, dstCount)));
						sampler.setOutput(output.clone().setArray(values.slice(0, dstCount * elementSize)));
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
