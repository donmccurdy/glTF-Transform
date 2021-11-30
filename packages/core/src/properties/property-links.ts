import { Link } from '../graph';
import { ExtensionProperty } from './extension-property';
import { Material } from './material';
import { Texture } from './texture';

/** @hidden */
export class TextureLink extends Link<Material | ExtensionProperty, Texture> {
	public channels = 0;
	public copy(other: this): this {
		this.channels = other.channels;
		return this;
	}
}
