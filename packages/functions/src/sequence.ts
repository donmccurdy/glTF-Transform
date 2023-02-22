import { Accessor, AnimationChannel, AnimationSampler, Document, Transform } from '@gltf-transform/core';
import { createTransform } from './utils.js';

const NAME = 'sequence';

export interface SequenceOptions {
	/** Frames per second, where one node is shown each frame. Default 10. */
	fps?: number;
	/** Pattern (regex) used to filter nodes for the sequence. Required. */
	pattern: RegExp;
	/** Name of the new animation. */
	name?: string;
	/** Whether to sort the nodes by name, or use original order. Default true. */
	sort?: boolean;
}

const SEQUENCE_DEFAULTS: Required<SequenceOptions> = {
	name: '',
	fps: 10,
	pattern: /.*/,
	sort: true,
};

/**
 * Creates an {@link Animation} displaying each of the specified {@link Node}s sequentially.
 */
export function sequence (_options: SequenceOptions = SEQUENCE_DEFAULTS): Transform {
	const options = {...SEQUENCE_DEFAULTS, ..._options} as Required<SequenceOptions>;

	return createTransform(NAME, (doc: Document): void => {

		const logger = doc.getLogger();
		const root = doc.getRoot();
		const fps = options.fps;

		// Collect sequence nodes.
		const sequenceNodes = root.listNodes()
			.filter((node) => node.getName().match(options.pattern));

		// Sort by node name.
		if (options.sort) {
			sequenceNodes.sort((a, b) => a.getName() > b.getName() ? 1 : -1);
		}

		// Create animation cycling visibility of each node.
		const anim = doc.createAnimation(options.name);
		const animBuffer = root.listBuffers()[0];
		sequenceNodes.forEach((node, i) => {
			// Create keyframe tracks that show each node for a single frame.
			let inputArray;
			let outputArray;
			if (i === 0) {
				inputArray = [i / fps, (i + 1) / fps];
				outputArray = [1, 1, 1, 0, 0, 0];
			} else if (i === sequenceNodes.length - 1) {
				inputArray = [(i - 1) / fps, i / fps];
				outputArray = [0, 0, 0, 1, 1, 1];
			} else {
				inputArray = [(i - 1) / fps, i / fps, (i + 1) / fps];
				outputArray = [0, 0, 0, 1, 1, 1, 0, 0, 0];
			}

			// Append channel to animation sequence.
			const input = doc.createAccessor()
				.setArray(new Float32Array(inputArray))
				.setBuffer(animBuffer);
			const output = doc.createAccessor()
				.setArray(new Float32Array(outputArray))
				.setBuffer(animBuffer)
				.setType(Accessor.Type.VEC3);
			const sampler = doc.createAnimationSampler()
				.setInterpolation(AnimationSampler.Interpolation.STEP)
				.setInput(input)
				.setOutput(output);
			const channel = doc.createAnimationChannel()
				.setTargetNode(node)
				.setTargetPath(AnimationChannel.TargetPath.SCALE)
				.setSampler(sampler);
			anim.addSampler(sampler).addChannel(channel);
		});

		logger.debug(`${NAME}: Complete.`);

	});

}
