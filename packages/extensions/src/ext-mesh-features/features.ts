import { ExtensionProperty, type IProperty, PropertyType, RefSet } from '@gltf-transform/core';
import { EXT_MESH_FEATURES } from '../constants.js';
import type { FeatureID } from './feature-id.js';

interface IFeatures extends IProperty {
	featureIds: RefSet<FeatureID>;
}

/**
 * Defines a list of Feature IDs on a {@link Primitive}. See {@Link EXTMeshFeatures}.
 *
 * @experimental
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

	listFeatureIDs(): FeatureID[] {
		return this.listRefs('featureIds');
	}

	addFeatureID(featureId: FeatureID) {
		return this.addRef('featureIds', featureId);
	}

	removeFeatureID(featureId: FeatureID) {
		return this.removeRef('featureIds', featureId);
	}
}
