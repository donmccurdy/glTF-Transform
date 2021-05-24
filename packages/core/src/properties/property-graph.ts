import { Graph } from '../graph';
import { Accessor } from './accessor';
import { ExtensionProperty } from './extension-property';
import { Material } from './material';
import { Primitive } from './primitive';
import { Property } from './property';
import { AttributeLink, IndexLink, TextureLink } from './property-links';
import { Texture } from './texture';

/** @hidden */
export class PropertyGraph extends Graph<Property> {
	public linkAttribute(name: string, a: Property, b: null): null;
	public linkAttribute(name: string, a: Property, b: Accessor): AttributeLink;
	public linkAttribute(name: string, a: Property, b: Accessor | null): AttributeLink | null;
	public linkAttribute(name: string, a: Property, b: Accessor | null): AttributeLink | null {
		if (!b) return null;
		const link = new AttributeLink(name, a, b);
		link.semantic = name;
		this.registerLink(link);
		return link;
	}

	public linkIndex(name: string, a: Primitive, b: null): null;
	public linkIndex(name: string, a: Primitive, b: Accessor): IndexLink;
	public linkIndex(name: string, a: Primitive, b: Accessor | null): IndexLink | null;
	public linkIndex(name: string, a: Primitive, b: Accessor | null): IndexLink | null {
		if (!b) return null;
		const link = new IndexLink(name, a, b);
		this.registerLink(link);
		return link;
	}

	public linkTexture(
		name: string, channels: number, a: Material | ExtensionProperty, b: null
	): null;
	public linkTexture(
		name: string, channels: number, a: Material | ExtensionProperty, b: Texture
	): TextureLink;
	public linkTexture(
		name: string, channels: number, a: Material | ExtensionProperty, b: Texture | null
	): TextureLink | null;
	public linkTexture(
		name: string, channels: number, a: Material | ExtensionProperty, b: Texture | null
	): TextureLink | null {
		if (!b) return null;
		const link = new TextureLink(name, a, b);
		link.channels = channels;
		this.registerLink(link);
		return link;
	}
}
