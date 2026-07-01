import {
	type Camera,
	Extension,
	type Material,
	type Node,
	type Property,
	PropertyType,
	type ReaderContext,
	type WriterContext,
} from '@gltf-transform/core';
import { KHR_ANIMATION_POINTER } from '../constants.js';
import { AnimationPointer } from './animation-pointer.js';

/**
 * [KHR_animation_pointer](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_animation_pointer)
 * defines the target of an animation channel using a pointer path.
 *
 * Properties:
 * - {@link AnimationPointer}
 *
 * ### Example
 *
 * ```typescript
 * import { KHRAnimationPointer } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const animationPointerExtension = document.createExtension(KHRAnimationPointer);
 *
 * // Create AnimationPointer property.
 * const animationPointer = animationPointerExtension.createAnimationPointer()
 *     .setPointer('/nodes/0/translation');
 *
 * // Assign to an AnimationChannel.
 * channel.setTargetPath('pointer');
 * channel.setExtension('KHR_animation_pointer', animationPointer);
 * ```
 */
export class KHRAnimationPointer extends Extension {
	public static readonly EXTENSION_NAME: typeof KHR_ANIMATION_POINTER = KHR_ANIMATION_POINTER;
	public readonly extensionName: typeof KHR_ANIMATION_POINTER = KHR_ANIMATION_POINTER;

	/** Creates a new AnimationPointer property for use on a {@link AnimationChannel}. */
	public createAnimationPointer(): AnimationPointer {
		return new AnimationPointer(this.document.getGraph());
	}

	/** @hidden */
	public read(context: ReaderContext): this {
		const jsonDoc = context.jsonDoc;
		const animationDefs = jsonDoc.json.animations || [];

		animationDefs.forEach((animationDef, animationIndex) => {
			const animation = context.animations[animationIndex];
			const channelDefs = animationDef.channels || [];
			const channels = animation.listChannels();

			channelDefs.forEach((channelDef, channelIndex) => {
				const target = channelDef.target;
				if (target.path === 'pointer' && target.extensions && target.extensions[KHR_ANIMATION_POINTER]) {
					const channel = channels[channelIndex];
					const animationPointer = this.createAnimationPointer();
					channel.setExtension(KHR_ANIMATION_POINTER, animationPointer);

					const pointerDef = target.extensions[KHR_ANIMATION_POINTER] as { pointer: string };
					const rawPointer = pointerDef.pointer || '';

					// Parse pointer to set targetProperty and remaining pointer path
					if (rawPointer.startsWith('/')) {
						const parts = rawPointer.split('/');
						const type = parts[1];
						const index = parseInt(parts[2], 10);
						let resolvedTarget: Property | null = null;

						if (type === 'nodes' && context.nodes[index]) {
							resolvedTarget = context.nodes[index];
						} else if (type === 'materials' && context.materials[index]) {
							resolvedTarget = context.materials[index];
						} else if (type === 'cameras' && context.cameras[index]) {
							resolvedTarget = context.cameras[index];
						}

						if (resolvedTarget) {
							animationPointer.setTargetProperty(resolvedTarget);
							animationPointer.setPointer(parts.slice(3).join('/'));
						} else {
							animationPointer.setPointer(rawPointer);
						}
					} else {
						animationPointer.setPointer(rawPointer);
					}
				}
			});
		});

		return this;
	}

	/** @hidden */
	public write(context: WriterContext): this {
		const jsonDoc = context.jsonDoc;

		for (const animation of this.document.getRoot().listAnimations()) {
			const animationIndex = context.animationIndexMap.get(animation);
			if (animationIndex === undefined) continue;

			const animationDef = jsonDoc.json.animations![animationIndex];
			const channels = animation.listChannels();

			channels.forEach((channel, channelIndex) => {
				const animationPointer = channel.getExtension<AnimationPointer>(KHR_ANIMATION_POINTER);
				if (!animationPointer) return;

				const channelDef = animationDef.channels[channelIndex];
				channelDef.target.extensions = channelDef.target.extensions || {};

				let finalPointer = animationPointer.getPointer();
				const targetProperty = animationPointer.getTargetProperty();

				if (targetProperty) {
					let typeSegment = '';
					let index: number | undefined;

					if (targetProperty.propertyType === PropertyType.NODE) {
						typeSegment = 'nodes';
						index = context.nodeIndexMap.get(targetProperty as Node);
					} else if (targetProperty.propertyType === PropertyType.MATERIAL) {
						typeSegment = 'materials';
						index = context.materialIndexMap.get(targetProperty as Material);
					} else if (targetProperty.propertyType === PropertyType.CAMERA) {
						typeSegment = 'cameras';
						index = context.cameraIndexMap.get(targetProperty as Camera);
					}

					if (index !== undefined) {
						finalPointer = `/${typeSegment}/${index}/${finalPointer}`;
					}
				}

				channelDef.target.extensions[KHR_ANIMATION_POINTER] = {
					pointer: finalPointer,
				};
			});
		}

		return this;
	}
}
