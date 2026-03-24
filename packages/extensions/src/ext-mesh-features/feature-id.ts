import { ExtensionProperty, type IProperty } from '@gltf-transform/core';
import { EXT_MESH_FEATURES } from '../constants.js';
import type { PropertyTable } from '../ext-structural-metadata/index.js';
import type { FeatureIdTexture } from './feature-id-texture.js';

interface IFeatureId extends IProperty {
	featureCount: number;
	nullFeatureId: number | null;
	label: string | null;
	attribute: number | null;
	texture: FeatureIdTexture;
	propertyTable: PropertyTable;
}

/**
 * Implementation of a feature ID for `EXT_mesh_features`
 *
 * @internal
 */
export class FeatureId extends ExtensionProperty<IFeatureId> {
	static override EXTENSION_NAME = EXT_MESH_FEATURES;
	public declare extensionName: typeof EXT_MESH_FEATURES;
	public declare propertyType: 'FeatureId';
	public declare parentTypes: ['MeshFeatures'];

	protected override init(): void {
		this.extensionName = EXT_MESH_FEATURES;
		this.propertyType = 'FeatureId';
		this.parentTypes = ['MeshFeatures'];
	}

	protected override getDefaults() {
		return Object.assign(super.getDefaults(), {
			nullFeatureId: null,
			label: null,
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

	getNullFeatureId(): number | null {
		return this.get('nullFeatureId');
	}
	setNullFeatureId(nullFeatureId: number | null) {
		return this.set('nullFeatureId', nullFeatureId);
	}

	getLabel(): string | null {
		return this.get('label');
	}
	setLabel(label: string | null) {
		return this.set('label', label);
	}

	getAttribute(): number | null {
		return this.get('attribute');
	}
	setAttribute(attribute: number | null) {
		return this.set('attribute', attribute);
	}

	getTexture(): FeatureIdTexture | null {
		return this.getRef('texture');
	}
	setTexture(texture: FeatureIdTexture | null) {
		return this.setRef('texture', texture);
	}

	getPropertyTable(): PropertyTable | null {
		return this.getRef('propertyTable');
	}
	setPropertyTable(propertyTable: PropertyTable | null) {
		return this.setRef('propertyTable', propertyTable);
	}
}
