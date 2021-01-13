import { Accessor, AnimationSampler, Document, Root, Transform } from '@gltf-transform/core';

const NAME = 'resample';

export interface ResampleOptions {tolerance?: number}

const DEFAULT_OPTIONS: ResampleOptions =  {tolerance: 1e-4};

/**
 * Removes redundant sequential keyframes, common in morph target sequences and baked animations.
 * Based on THREE.KeyframeTrack.optimize().
 *
 * Example: (0,0,0,0,1,1,1,0,0,0,0,0,0,0) --> (0,0,1,1,0,0)
 */
export const resample = (options: ResampleOptions = DEFAULT_OPTIONS): Transform => {

	options = {...DEFAULT_OPTIONS, ...options};

	return (doc: Document): void => {
		const accessorsVisited = new Set<Accessor>();
		const accessorsCountPrev = doc.getRoot().listAccessors().length;
		const logger = doc.getLogger();

		for (const animation of doc.getRoot().listAnimations()) {
			for (const sampler of animation.listSamplers()) {
				if (sampler.getInterpolation() === 'STEP'
					|| sampler.getInterpolation() === 'LINEAR') {
					accessorsVisited.add(sampler.getInput());
					accessorsVisited.add(sampler.getOutput());
					optimize(sampler, options);
				}
			}
		}

		for (const accessor of Array.from(accessorsVisited.values())) {
			const used = !!accessor.listParents().find((p) => !(p instanceof Root));
			if (!used) accessor.dispose();
		}

		if (doc.getRoot().listAccessors().length > accessorsCountPrev) {
			logger.warn(
				`${NAME}: Resampling required copying accessors, some of which may be duplicates.`
				+ ' Consider using "dedup" to consolidate any duplicates.'
			);
		}

		logger.debug(`${NAME}: Complete.`);
	};

};

function optimize (sampler: AnimationSampler, options: ResampleOptions): void {
	if (!['STEP', 'LINEAR'].includes(sampler.getInterpolation())) return;

	const input = sampler.getInput().clone();
	const output = sampler.getOutput().clone();

	const tolerance = options.tolerance as number;

	const lastIndex = input.getCount() - 1;
	const tmp = [];

	let writeIndex = 1;

	for (let i = 1; i < lastIndex; ++ i) {
		const time = input.getScalar(i);
		const timePrev = input.getScalar(i - 1);
		const timeNext = input.getScalar(i + 1);
		const timeMix = (time - timePrev) / (timeNext - timePrev);

		let keep = false;

		// Remove unnecessary adjacent keyframes.
		if (time !== timeNext && (i !== 1 || time !== input.getScalar(0))) {
			for (let j = 0; j < output.getElementSize(); j++) {
				const value = output.getElement(i, tmp)[j];
				const valuePrev = output.getElement(i - 1, tmp)[j];
				const valueNext = output.getElement(i + 1, tmp)[j];

				if (sampler.getInterpolation() === 'LINEAR') {
					// Prune keyframes that are colinear with prev/next keyframes.
					if (Math.abs(value - lerp(valuePrev, valueNext, timeMix)) > tolerance) {
						keep = true;
						break;
					}
				} else if (sampler.getInterpolation() === 'STEP') {
					// Prune keyframes that are identical to prev/next keyframes.
					if (value !== valuePrev || value !== valueNext) {
						keep = true;
						break;
					}
				}
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
		input.setArray(input.getArray().slice(0, writeIndex));
		output.setArray(output.getArray().slice(0, writeIndex * output.getElementSize()));
		sampler.setInput(input);
		sampler.setOutput(output);
	} else {
		input.dispose();
		output.dispose();
	}
}

function lerp (v0: number, v1: number, t: number): number {
    return v0 * (1 - t) + v1 * t;
}
