import { Link } from '../graph';
import { Accessor } from './accessor';
import { ExtensionProperty } from './extension-property';
import { Material } from './material';
import { Primitive, PrimitiveTarget } from './mesh';
import { Texture, TextureInfo, TextureSampler } from './texture';

/** @hidden */
export class TextureLink extends Link<Material|ExtensionProperty, Texture> {
	public textureInfo = new TextureInfo();
	public sampler = new TextureSampler();
}

/** @hidden */
export class AttributeLink extends Link<Primitive|PrimitiveTarget, Accessor> {
	public semantic = '';
}

/** @hidden */
export class IndexLink extends Link<Primitive, Accessor> {}
