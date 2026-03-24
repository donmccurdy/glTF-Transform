import { ExtensionProperty, type IProperty, PropertyType, RefSet } from '@gltf-transform/core';
import { EXT_MESH_FEATURES } from '../constants.js';
import type { FeatureId } from './feature-id.js';

interface IFeatures extends IProperty {
	featureIds: RefSet<FeatureId>;
}

/**
 * TODO
 */
export class Features extends ExtensionProperty<IFeatures> {
	static override EXTENSION_NAME = EXT_MESH_FEATURES;
	public declare extensionName: typeof EXT_MESH_FEATURES;
	public declare propertyType: 'Features';
	public declare parentTypes: [PropertyType.PRIMITIVE];

	protected override init(): void {
		this.extensionName = EXT_MESH_FEATURES;
		this.propertyType = 'Features';
		this.parentTypes = [PropertyType.PRIMITIVE];
	}

	protected override getDefaults() {
		return Object.assign(super.getDefaults(), {
			featureIds: new RefSet([]),
		});
	}

	listFeatureIds(): FeatureId[] {
		return this.listRefs('featureIds');
	}
	addFeatureId(featureId: FeatureId) {
		return this.addRef('featureIds', featureId);
	}
	removeFeatureId(featureId: FeatureId) {
		return this.removeRef('featureIds', featureId);
	}
}
