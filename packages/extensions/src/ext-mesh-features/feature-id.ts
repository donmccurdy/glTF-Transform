import { ExtensionProperty, type IProperty } from '@gltf-transform/core';
import { EXT_MESH_FEATURES } from '../constants.js';
import type { PropertyTable } from '../ext-structural-metadata/index.js';
import type { FeatureIDTexture } from './feature-id-texture.js';

interface IFeatureID extends IProperty {
	featureCount: number;
	nullFeatureId: number | null;
	label: string;
	attribute: number | null;
	texture: FeatureIDTexture;
	propertyTable: PropertyTable;
}

/**
 * Defines a Feature ID on a {@link Primitive}. See {@link EXTMeshFeatures}.
 *
 * @experimental
 */
export class FeatureID extends ExtensionProperty<IFeatureID> {
	static override EXTENSION_NAME = EXT_MESH_FEATURES;
	public declare extensionName: typeof EXT_MESH_FEATURES;
	public declare propertyType: 'FeatureID';
	public declare parentTypes: ['Features'];

	protected override init(): void {
		this.extensionName = EXT_MESH_FEATURES;
		this.propertyType = 'FeatureID';
		this.parentTypes = ['Features'];
	}

	protected override getDefaults() {
		return Object.assign(super.getDefaults(), {
			nullFeatureId: null,
			label: '',
			attribute: null,
			texture: null,
			propertyTable: null,
		});
	}

	getFeatureCount(): number {
		return this.get('featureCount');
	}

	setFeatureCount(featureCount: number) {
		return this.set('featureCount', featureCount);
	}

	getNullFeatureID(): number | null {
		return this.get('nullFeatureId');
	}

	setNullFeatureID(nullFeatureId: number | null) {
		return this.set('nullFeatureId', nullFeatureId);
	}

	getLabel(): string {
		return this.get('label');
	}

	setLabel(label: string) {
		return this.set('label', label);
	}

	getAttribute(): number | null {
		return this.get('attribute');
	}

	setAttribute(attribute: number | null) {
		return this.set('attribute', attribute);
	}

	getTexture(): FeatureIDTexture | null {
		return this.getRef('texture');
	}

	setTexture(texture: FeatureIDTexture | null) {
		return this.setRef('texture', texture);
	}

	getPropertyTable(): PropertyTable | null {
		return this.getRef('propertyTable');
	}

	setPropertyTable(propertyTable: PropertyTable | null) {
		return this.setRef('propertyTable', propertyTable);
	}
}
