import { Link } from '../graph';
import { Accessor } from './accessor';
import { ExtensionProperty } from './extension-property';
import { Material } from './material';
import { Primitive, PrimitiveTarget } from './mesh';
import { Texture } from './texture';
import { TextureInfo } from './texture-info';
import { TextureSampler } from './texture-sampler';

/** @hidden */
export class TextureLink extends Link<Material|ExtensionProperty, Texture> {
	public textureInfo = new TextureInfo();
	public sampler = new TextureSampler();
	public copy (other: this): this {
		this.textureInfo.copy(other.textureInfo);
		this.sampler.copy(other.sampler);
		return this;
	}
}

/** @hidden */
export class AttributeLink extends Link<Primitive|PrimitiveTarget, Accessor> {
	public semantic = '';
	public copy (other: this): this {
		this.semantic = other.semantic;
		return this;
	}
}

/** @hidden */
export class IndexLink extends Link<Primitive, Accessor> {
	public copy (other: this): this { return this; }
}
