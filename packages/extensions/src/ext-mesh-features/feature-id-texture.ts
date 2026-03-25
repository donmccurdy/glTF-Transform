import { ExtensionProperty, type IProperty, type Texture, TextureInfo } from '@gltf-transform/core';
import { EXT_MESH_FEATURES } from '../constants.js';

interface IFeatureIdTexture extends IProperty {
	channels: number[];
	texture: Texture;
	textureInfo: TextureInfo;
}

/**
 * Implementation of a feature ID texture for `EXT_mesh_features`
 *
 * @internal
 */
export class FeatureIdTexture extends ExtensionProperty<IFeatureIdTexture> {
	static override EXTENSION_NAME = EXT_MESH_FEATURES;

	public declare extensionName: typeof EXT_MESH_FEATURES;
	public declare propertyType: 'FeatureIdTexture';
	public declare parentTypes: ['FeatureId'];

	protected override init(): void {
		this.extensionName = EXT_MESH_FEATURES;
		this.propertyType = 'FeatureIdTexture';
		this.parentTypes = ['FeatureId'];
	}

	protected override getDefaults() {
		const defaultTextureInfo = new TextureInfo(this.graph, 'textureInfo');
		defaultTextureInfo.setMinFilter(TextureInfo.MagFilter.NEAREST);
		defaultTextureInfo.setMagFilter(TextureInfo.MagFilter.NEAREST);
		return Object.assign(super.getDefaults(), {
			channels: [0],
			texture: null,
			textureInfo: defaultTextureInfo,
		});
	}

	getChannels(): number[] {
		return this.get('channels');
	}
	setChannels(channels: number[]) {
		return this.set('channels', channels);
	}

	getTexture(): Texture | null {
		return this.getRef('texture');
	}
	setTexture(texture: Texture | null) {
		return this.setRef('texture', texture);
	}

	getTextureInfo(): TextureInfo | null {
		return this.getRef('texture') ? this.getRef('textureInfo') : null;
	}
}
