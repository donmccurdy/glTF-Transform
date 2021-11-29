import { Graph } from '../graph';
import { ExtensionProperty } from './extension-property';
import { Material } from './material';
import { Property } from './property';
import { TextureLink } from './property-links';
import { Texture } from './texture';

/** @hidden */
export class PropertyGraph extends Graph<Property> {
	public linkTexture(name: string, channels: number, a: Material | ExtensionProperty, b: null): null;
	public linkTexture(name: string, channels: number, a: Material | ExtensionProperty, b: Texture): TextureLink;
	public linkTexture(
		name: string,
		channels: number,
		a: Material | ExtensionProperty,
		b: Texture | null
	): TextureLink | null;
	public linkTexture(
		name: string,
		channels: number,
		a: Material | ExtensionProperty,
		b: Texture | null
	): TextureLink | null {
		if (!b) return null;
		const link = new TextureLink(name, a, b);
		link.channels = channels;
		this.registerLink(link);
		return link;
	}
}
