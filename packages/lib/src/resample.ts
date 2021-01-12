import { AnimationSampler, Document, Transform } from '@gltf-transform/core';

const NAME = 'resample';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ResampleOptions {tolerance?: number}

const DEFAULT_OPTIONS: ResampleOptions =  {tolerance: 1e-4};

/**
 * Removes equivalent sequential keyframes, common in morph target sequences and baked animations.
 * Based on THREE.KeyframeTrack.optimize().
 *
 * Example: (0,0,0,0,1,1,1,0,0,0,0,0,0,0) --> (0,0,1,1,0,0)
 */
export const resample = (options: ResampleOptions): Transform => {

	options = {...DEFAULT_OPTIONS, ...options};

	return (doc: Document): void => {
		const logger = doc.getLogger();

		// TODO(bug): input/output accessors shared among samplers may be
		// overwritten in unsafe ways here.
		for (const animation of doc.getRoot().listAnimations()) {
			for (const sampler of animation.listSamplers()) {
				if (sampler.getInterpolation() === 'STEP'
					|| sampler.getInterpolation() === 'LINEAR') {
					optimize(sampler, options);
				}
			}
		}

		logger.debug(`${NAME}: Complete.`);
	};

};

function optimize (sampler: AnimationSampler, options: ResampleOptions): void {
	const input = sampler.getInput();
	const output = sampler.getOutput();
	const stride = output.getElementSize();

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
			for (let j = 0; j < stride; j++) {
				const value = output.getElement(i, tmp)[j];
				const valuePrev = output.getElement(i - 1, tmp)[j];
				const valueNext = output.getElement(i + 1, tmp)[j];



				if (sampler.getInterpolation() === 'LINEAR') {
					// Prune keyframes that are linearly interpolated from prev/next keyframes.
					if (Math.abs(value - lerp(valuePrev, valueNext, timeMix)) > options.tolerance) {
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

	// Truncate sampler input and output.
	if (writeIndex !== input.getCount()) {
		input.setArray(input.getArray().slice(0, writeIndex));
		output.setArray(output.getArray().slice(0, writeIndex * output.getElementSize()));
	}
}

function lerp (v0: number, v1: number, t: number): number {
    return v0 * (1 - t) + v1 * t;
}
