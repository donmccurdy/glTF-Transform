import { ExtensionProperty, type IProperty, type Nullable, type Property, PropertyType } from '@gltf-transform/core';
import { KHR_ANIMATION_POINTER } from '../constants.js';

interface IAnimationPointer extends IProperty {
	pointer: string;
	targetProperty: Property;
}

/**
 * Defines the target of an animation channel using a pointer path. See {@link KHRAnimationPointer}.
 */
export class AnimationPointer extends ExtensionProperty<IAnimationPointer> {
	public static EXTENSION_NAME: typeof KHR_ANIMATION_POINTER = KHR_ANIMATION_POINTER;
	public declare extensionName: typeof KHR_ANIMATION_POINTER;
	public declare propertyType: 'AnimationPointer';
	public declare parentTypes: [PropertyType.ANIMATION_CHANNEL];

	protected init(): void {
		this.extensionName = KHR_ANIMATION_POINTER;
		this.propertyType = 'AnimationPointer';
		this.parentTypes = [PropertyType.ANIMATION_CHANNEL];
	}

	protected getDefaults(): Nullable<IAnimationPointer> {
		return Object.assign(super.getDefaults() as IProperty, {
			pointer: '',
			targetProperty: null,
		});
	}

	/** Pointer path. */
	public getPointer(): string {
		return this.get('pointer');
	}

	/** Pointer path. */
	public setPointer(pointer: string): this {
		return this.set('pointer', pointer);
	}

	/** Target property referenced by the pointer. */
	public getTargetProperty(): Property | null {
		return this.getRef('targetProperty');
	}

	/** Target property referenced by the pointer. */
	public setTargetProperty(targetProperty: Property | null): this {
		return this.setRef('targetProperty', targetProperty, { modifyChild: true });
	}
}
