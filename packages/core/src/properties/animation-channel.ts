import { PropertyType } from '../constants';
import { GraphChild, Link } from '../graph';
import { GLTF } from '../types/gltf';
import { AnimationSampler } from './animation-sampler';
import { Node } from './node';
import { COPY_IDENTITY, Property } from './property';

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
 * - [glTF → Animations](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#animations)
 */
export class AnimationChannel extends Property {
	public readonly propertyType = PropertyType.ANIMATION_CHANNEL;

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
	}

	/**********************************************************************************************
	 * Instance.
	 */

	private _targetPath: GLTF.AnimationChannelTargetPath | null = null;
	@GraphChild private targetNode: Link<AnimationChannel, Node> | null = null;
	@GraphChild private sampler: Link<AnimationChannel, AnimationSampler> | null = null;

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this._targetPath = other._targetPath;

		this.setTargetNode(other.targetNode ? resolve(other.targetNode.getChild()) : null);
		this.setSampler(other.sampler ? resolve(other.sampler.getChild()) : null);

		return this;
	}

	/**********************************************************************************************
	 * Properties.
	 */

	/**
	 * Path (property) animated on the target {@link Node}. Supported values include:
	 * `translation`, `rotation`, `scale`, or `weights`.
	 */
	public getTargetPath(): GLTF.AnimationChannelTargetPath | null {
		return this._targetPath;
	}

	/**
	 * Path (property) animated on the target {@link Node}. Supported values include:
	 * `translation`, `rotation`, `scale`, or `weights`.
	 */
	public setTargetPath(targetPath: GLTF.AnimationChannelTargetPath): this {
		this._targetPath = targetPath;
		return this;
	}

	/** Target {@link Node} animated by the channel. */
	public getTargetNode(): Node | null {
		return this.targetNode ? this.targetNode.getChild() : null;
	}

	/** Target {@link Node} animated by the channel. */
	public setTargetNode(targetNode: Node | null): this {
		this.targetNode = this.graph.link('target.node', this, targetNode);
		return this;
	}

	/**
	 * Keyframe data input/output values for the channel. Must be attached to the same
	 * {@link Animation}.
	 */
	public getSampler(): AnimationSampler | null {
		return this.sampler ? this.sampler.getChild() : null;
	}

	/**
	 * Keyframe data input/output values for the channel. Must be attached to the same
	 * {@link Animation}.
	 */
	public setSampler(sampler: AnimationSampler | null): this {
		this.sampler = this.graph.link('sampler', this, sampler);
		return this;
	}
}
