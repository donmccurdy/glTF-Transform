import { Nullable, PropertyType } from '../constants.js';
import type { GLTF } from '../types/gltf.js';
import type { AnimationSampler } from './animation-sampler.js';
import { ExtensibleProperty, IExtensibleProperty } from './extensible-property.js';
import type { Node } from './node.js';

interface IAnimationChannel extends IExtensibleProperty {
	targetPath: GLTF.AnimationChannelTargetPath | null;
	targetNode: Node;
	sampler: AnimationSampler;
}

/**
 * # AnimationChannel
 *
 * *A target-path pair within a larger {@link Animation}, which refers to an
 * {@link AnimationSampler} storing the keyframe data for that pair.*
 *
 * A _target_ is always a {@link Node}, in the core glTF spec. A _path_ is any property of that
 * Node that can be affected by animation: `translation`, `rotation`, `scale`, or `weights`. An
 * {@link Animation} affecting the positions and rotations of several {@link Node}s would contain
 * one channel for each Node-position or Node-rotation pair. The keyframe data for an
 * AnimationChannel is stored in an {@link AnimationSampler}, which must be attached to the same
 * {@link Animation}.
 *
 * Usage:
 *
 * ```ts
 * const node = doc.getRoot()
 * 	.listNodes()
 * 	.find((node) => node.getName() === 'Cog');
 *
 * const channel = doc.createAnimationChannel('cogRotation')
 * 	.setTargetPath('rotation')
 * 	.setTargetNode(node)
 * 	.setSampler(rotateSampler);
 * ```
 *
 * Reference
 * - [glTF → Animations](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#animations)
 */
export class AnimationChannel extends ExtensibleProperty<IAnimationChannel> {
	public declare propertyType: PropertyType.ANIMATION_CHANNEL;

	/**********************************************************************************************
	 * Constants.
	 */

	/** Name of the property to be modified by an animation channel. */
	public static TargetPath: Record<string, GLTF.AnimationChannelTargetPath> = {
		/** Channel targets {@link Node.setTranslation}. */
		TRANSLATION: 'translation',
		/** Channel targets {@link Node.setRotation}. */
		ROTATION: 'rotation',
		/** Channel targets {@link Node.setScale}. */
		SCALE: 'scale',
		/** Channel targets {@link Node.setWeights}, affecting {@link PrimitiveTarget} weights. */
		WEIGHTS: 'weights',
	};

	/**********************************************************************************************
	 * Instance.
	 */

	protected init(): void {
		this.propertyType = PropertyType.ANIMATION_CHANNEL;
	}

	protected getDefaults(): Nullable<IAnimationChannel> {
		return Object.assign(super.getDefaults() as IExtensibleProperty, {
			targetPath: null,
			targetNode: null,
			sampler: null,
		});
	}

	/**********************************************************************************************
	 * Properties.
	 */

	/**
	 * Path (property) animated on the target {@link Node}. Supported values include:
	 * `translation`, `rotation`, `scale`, or `weights`.
	 */
	public getTargetPath(): GLTF.AnimationChannelTargetPath | null {
		return this.get('targetPath');
	}

	/**
	 * Path (property) animated on the target {@link Node}. Supported values include:
	 * `translation`, `rotation`, `scale`, or `weights`.
	 */
	public setTargetPath(targetPath: GLTF.AnimationChannelTargetPath): this {
		return this.set('targetPath', targetPath);
	}

	/** Target {@link Node} animated by the channel. */
	public getTargetNode(): Node | null {
		return this.getRef('targetNode');
	}

	/** Target {@link Node} animated by the channel. */
	public setTargetNode(targetNode: Node | null): this {
		return this.setRef('targetNode', targetNode);
	}

	/**
	 * Keyframe data input/output values for the channel. Must be attached to the same
	 * {@link Animation}.
	 */
	public getSampler(): AnimationSampler | null {
		return this.getRef('sampler');
	}

	/**
	 * Keyframe data input/output values for the channel. Must be attached to the same
	 * {@link Animation}.
	 */
	public setSampler(sampler: AnimationSampler | null): this {
		return this.setRef('sampler', sampler);
	}
}
