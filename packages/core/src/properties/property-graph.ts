import { Graph } from '../graph';
import { Accessor } from './accessor';
import { Material } from './material';
import { Primitive } from './mesh';
import { AttributeLink, IndexLink, TextureLink } from './property-links';
import { Texture } from './texture';

/** @hidden */
export class PropertyGraph extends Graph {
	public linkTexture(name: string, a: Material, b: Texture): TextureLink {
		const link = new TextureLink(name, a, b);
		this.registerLink(link);
		return link;
	}

	public linkAttribute(name: string, a: Primitive, b: Accessor): AttributeLink {
		const link = new AttributeLink(name, a, b);
		this.registerLink(link);
		return link;
	}

	public linkIndex(name: string, a: Primitive, b: Accessor): IndexLink {
		const link = new IndexLink(name, a, b);
		this.registerLink(link);
		return link;
	}
}
