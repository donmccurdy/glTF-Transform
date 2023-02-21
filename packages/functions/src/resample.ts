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
} from '@gltf-transform/core';
import quat, { getAngle, slerp } from 'gl-matrix/quat';
import { dedup } from './dedup.js';
import { createTransform, isTransformPending } from './utils.js';

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
export const resample = (_options: ResampleOptions = RESAMPLE_DEFAULTS): Transform => {
	const options = { ...RESAMPLE_DEFAULTS, ..._options } as Required<ResampleOptions>;

	return createTransform(NAME, async (document: Document, context?: TransformContext): Promise<void> => {
		const accessorsVisited = new Set<Accessor>();
		const srcAccessorCount = document.getRoot().listAccessors().length;
		const logger = document.getLogger();

		let didSkipMorphTargets = false;

		for (const animation of document.getRoot().listAnimations()) {
			// Skip morph targets, see https://github.com/donmccurdy/glTF-Transform/issues/290.
			const samplerTargetPaths = new Map<AnimationSampler, GLTF.AnimationChannelTargetPath>();
			for (const channel of animation.listChannels()) {
				samplerTargetPaths.set(channel.getSampler()!, channel.getTargetPath()!);
			}

			for (const sampler of animation.listSamplers()) {
				if (samplerTargetPaths.get(sampler) === 'weights') {
					didSkipMorphTargets = true;
					continue;
				}
				if (sampler.getInterpolation() === 'STEP' || sampler.getInterpolation() === 'LINEAR') {
					accessorsVisited.add(sampler.getInput()!);
					accessorsVisited.add(sampler.getOutput()!);
					optimize(sampler, samplerTargetPaths.get(sampler)!, options);
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

		if (didSkipMorphTargets) {
			logger.warn(`${NAME}: Skipped optimizing morph target keyframes, not yet supported.`);
		}

		logger.debug(`${NAME}: Complete.`);
	});
};

function optimize(sampler: AnimationSampler, path: GLTF.AnimationChannelTargetPath, options: ResampleOptions): void {
	const input = sampler.getInput()!.clone().setSparse(false);
	const output = sampler.getOutput()!.clone().setSparse(false);

	const tolerance = options.tolerance as number;
	const interpolation = sampler.getInterpolation();

	const lastIndex = input.getCount() - 1;
	const tmp: number[] = [];
	const value: number[] = [];
	const valueNext: number[] = [];
	const valuePrev: number[] = [];

	let writeIndex = 1;

	for (let i = 1; i < lastIndex; ++i) {
		const timePrev = input.getScalar(writeIndex - 1);
		const time = input.getScalar(i);
		const timeNext = input.getScalar(i + 1);
		const t = (time - timePrev) / (timeNext - timePrev);

		let keep = false;

		// Remove unnecessary adjacent keyframes.
		if (time !== timeNext && (i !== 1 || time !== input.getScalar(0))) {
			output.getElement(writeIndex - 1, valuePrev);
			output.getElement(i, value);
			output.getElement(i + 1, valueNext);

			if (interpolation === 'LINEAR' && path === 'rotation') {
				// Prune keyframes colinear with prev/next keyframes.
				const sample = slerp(tmp as quat, valuePrev as quat, valueNext as quat, t) as number[];
				const angle = getAngle(valuePrev as quat, value as quat) + getAngle(value as quat, valueNext as quat);
				keep = !MathUtils.eq(value, sample, tolerance) || angle + Number.EPSILON >= Math.PI;
			} else if (interpolation === 'LINEAR') {
				// Prune keyframes colinear with prev/next keyframes.
				const sample = vlerp(tmp, valuePrev, valueNext, t);
				keep = !MathUtils.eq(value, sample, tolerance);
			} else if (interpolation === 'STEP') {
				// Prune keyframes identical to prev/next keyframes.
				keep = !MathUtils.eq(value, valuePrev) || !MathUtils.eq(value, valueNext);
			}
		}

		// In-place compaction.
		if (keep) {
			if (i !== writeIndex) {
				input.setScalar(writeIndex, input.getScalar(i));
				output.setElement(writeIndex, output.getElement(i, tmp));
			}
			writeIndex++;
		}
	}

	// Flush last keyframe (compaction looks ahead).
	if (lastIndex > 0) {
		input.setScalar(writeIndex, input.getScalar(lastIndex));
		output.setElement(writeIndex, output.getElement(lastIndex, tmp));
		writeIndex++;
	}

	// If the sampler was optimized, truncate and save the results. If not, clean up.
	if (writeIndex !== input.getCount()) {
		input.setArray(input.getArray()!.slice(0, writeIndex));
		output.setArray(output.getArray()!.slice(0, writeIndex * output.getElementSize()));
		sampler.setInput(input);
		sampler.setOutput(output);
	} else {
		input.dispose();
		output.dispose();
	}
}

function lerp(v0: number, v1: number, t: number): number {
	return v0 * (1 - t) + v1 * t;
}

function vlerp(out: number[], a: number[], b: number[], t: number): number[] {
	for (let i = 0; i < a.length; i++) out[i] = lerp(a[i], b[i], t);
	return out;
}
