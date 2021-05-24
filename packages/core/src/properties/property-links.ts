import { Link } from '../graph';
import { Accessor } from './accessor';
import { ExtensionProperty } from './extension-property';
import { Material } from './material';
import { Primitive } from './primitive';
import { Property } from './property';
import { Texture } from './texture';

/** @hidden */
export class AttributeLink extends Link<Property, Accessor> {
	public semantic = '';
	public copy (other: this): this {
		this.semantic = other.semantic;
		return this;
	}
}

/** @hidden */
export class IndexLink extends Link<Primitive, Accessor> {
	public copy (_other: this): this { return this; }
}

/** @hidden */
export class TextureLink extends Link<Material | ExtensionProperty, Texture> {
	public channels = 0;
	public copy (other: this): this {
		this.channels = other.channels;
		return this;
	}
}
