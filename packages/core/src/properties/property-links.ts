import { Link } from '../graph';
import { Accessor } from './accessor';
import { ExtensionProperty } from './extension-property';
import { Material } from './material';
import { Primitive } from './primitive';
import { PrimitiveTarget } from './primitive-target';
import { Texture } from './texture';
import { TextureInfo } from './texture-info';

/** @hidden */
export class TextureLink extends Link<Material|ExtensionProperty, Texture> {
	private _textureInfo: Link<Material|ExtensionProperty, TextureInfo>;
	public copy (other: this): this {
		this._textureInfo.getChild().copy(other._textureInfo.getChild());
		return this;
	}
	public getTextureInfo(): TextureInfo {
		return this._textureInfo.getChild();
	}
	public setTextureInfoLink(link: Link<Material|ExtensionProperty, TextureInfo>): this {
		this._textureInfo = link;
		return this;
	}
	public dispose(): void {
		this._textureInfo.dispose();
		super.dispose();
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
